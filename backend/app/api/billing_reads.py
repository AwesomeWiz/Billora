from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.core.db import AsyncSessionLocal
from app.models.account import Account, Role
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.plan import Plan
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.schemas.billing import (
    AccountDto,
    DashboardDto,
    InvoiceAccountDto,
    InvoiceDto,
    RecordPage,
    SubscriptionDto,
)

router = APIRouter(tags=["Billing reads"])


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


def internal_or_customer_account(current: dict, account_id: str | None = None) -> str | None:
    role = current["account"].role
    if role == Role.CUSTOMER:
        own_id = current["account"].id
        if account_id is not None and account_id != own_id:
            raise HTTPException(status_code=404, detail="Record not found")
        return own_id
    if role in (Role.ADMIN, Role.STAFF):
        return account_id
    raise HTTPException(status_code=403, detail="Insufficient permissions")


def page_response(items: list[Any], total: int, page: int, page_size: int) -> dict[str, Any]:
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_next": page * page_size < total,
    }


def account_dto(account: Any, customer: Customer | None) -> AccountDto:
    name = customer.name.strip() if customer and customer.name.strip() else account.email
    return AccountDto(id=account.id, display_name=name, billing_email=account.email)


def subscription_dto(subscription: Subscription, customer: Customer, plan: Plan) -> SubscriptionDto:
    # The legacy schema stores only ACTIVE/CANCELED/EXPIRED; preserve only the
    # supported active-vs-closed distinction and do not invent renewal dates.
    state = subscription.status if subscription.status in {
        "DRAFT", "QUOTATION", "CONFIRMED", "ACTIVE", "PAUSED", "CLOSED"
    } else "CLOSED"
    return SubscriptionDto(
        id=subscription.id,
        number=subscription.id,
        account_id=customer.account_id,
        plan_id=plan.id,
        status=state,
        currency=plan.currency,
        billing_interval=plan.billing_interval,
        recurring_amount_minor=plan.base_fee_minor if plan.bill_plan_base_fee else None,
        start_date=subscription.start_date.date() if subscription.start_date else None,
        expiry_date=subscription.end_date.date() if subscription.end_date else None,
        next_billing_date=None,
    )


def invoice_dto(
    invoice: Invoice,
    subscription: Subscription,
    customer: Customer,
    account: Account,
    _plan: Plan,
    recorded_paid: int,
) -> InvoiceDto:
    total = invoice.amount_paise
    paid = total if invoice.paid else recorded_paid
    return InvoiceDto(
        id=invoice.id,
        number=invoice.id,
        billing_account_id=customer.account_id,
        issued_on=invoice.issued_at.date(),
        due_on=invoice.due_date.date(),
        status="PAID" if invoice.paid else "CONFIRMED",
        currency="INR",
        total_minor=total,
        paid_minor=paid,
        balance_minor=total - paid,
        payment_status="PAID" if invoice.paid else ("PARTIALLY_PAID" if paid else "UNPAID"),
        billing_account=InvoiceAccountDto(
            id=customer.account_id,
            display_name=customer.name.strip() or account.email,
            billing_email=account.email,
        ),
    )


def subscription_stmt():
    return (
        select(Subscription, Customer, Plan)
        .join(Customer, Subscription.customer_id == Customer.id)
        .join(Plan, Subscription.plan_id == Plan.id)
    )


def invoice_stmt():
    recorded_paid = (
        select(func.coalesce(func.sum(Payment.amount_minor), 0))
        .where(Payment.invoice_id == Invoice.id)
        .correlate(Invoice)
        .scalar_subquery()
    )
    return (
        select(Invoice, Subscription, Customer, Account, Plan, recorded_paid)
        .join(Subscription, Invoice.subscription_id == Subscription.id)
        .join(Customer, Subscription.customer_id == Customer.id)
        .join(Account, Customer.account_id == Account.id)
        .join(Plan, Subscription.plan_id == Plan.id)
    )


@router.get("/accounts", response_model=RecordPage[AccountDto])
async def list_accounts(
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current["account"].role not in (Role.ADMIN, Role.STAFF):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    stmt = (
        select(Account, Customer)
        .outerjoin(Customer, Customer.account_id == Account.id)
        .where(Account.role == Role.CUSTOMER)
    )
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(Customer.name.ilike(term), Account.email.ilike(term)))
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (await db.execute(
        stmt.order_by(Account.created_at.desc(), Account.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )).all()
    return page_response([account_dto(account, customer) for account, customer in rows], total, page, page_size)


@router.get("/accounts/{account_id}", response_model=AccountDto)
async def read_account(account_id: str, current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    scoped_id = internal_or_customer_account(current, account_id)
    row = (await db.execute(
        select(Account, Customer)
        .outerjoin(Customer, Customer.account_id == Account.id)
        .where(Account.id == scoped_id, Account.role == Role.CUSTOMER)
    )).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Customer account not found")
    return account_dto(*row)


@router.get("/subscriptions", response_model=RecordPage[SubscriptionDto])
async def list_subscriptions(
    search: str | None = None,
    status: str | None = None,
    customer_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scoped_id = internal_or_customer_account(current, customer_id)
    stmt = subscription_stmt()
    if scoped_id:
        stmt = stmt.where(Customer.account_id == scoped_id)
    if status:
        status_map = {"ACTIVE": "ACTIVE", "CLOSED": ("CANCELED", "EXPIRED")}
        if status not in status_map:
            raise HTTPException(status_code=422, detail="Unsupported stored subscription status")
        stored = status_map[status]
        stmt = stmt.where(Subscription.status.in_(stored) if isinstance(stored, tuple) else Subscription.status == stored)
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(Subscription.id.ilike(term), Customer.name.ilike(term), Plan.name.ilike(term)))
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (await db.execute(stmt.order_by(Subscription.start_date.desc(), Subscription.id).offset((page - 1) * page_size).limit(page_size))).all()
    return page_response([subscription_dto(*row) for row in rows], total, page, page_size)


@router.get("/subscriptions/{subscription_id}", response_model=SubscriptionDto)
async def read_subscription(subscription_id: str, current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    scoped_id = internal_or_customer_account(current)
    stmt = subscription_stmt().where(Subscription.id == subscription_id)
    if scoped_id:
        stmt = stmt.where(Customer.account_id == scoped_id)
    row = (await db.execute(stmt)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return subscription_dto(*row)


@router.get("/invoices", response_model=RecordPage[InvoiceDto])
async def list_invoices(
    search: str | None = None,
    status: str | None = None,
    account_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scoped_id = internal_or_customer_account(current, account_id)
    stmt = invoice_stmt()
    if scoped_id:
        stmt = stmt.where(Customer.account_id == scoped_id)
    if status:
        if status not in ("CONFIRMED", "PAID"):
            raise HTTPException(status_code=422, detail="Unsupported stored invoice status")
        stmt = stmt.where(Invoice.paid.is_(status == "PAID"))
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(Invoice.id.ilike(term), Customer.name.ilike(term), Account.email.ilike(term)))
    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (await db.execute(stmt.order_by(Invoice.issued_at.desc(), Invoice.id).offset((page - 1) * page_size).limit(page_size))).all()
    return page_response([invoice_dto(*row) for row in rows], total, page, page_size)


@router.get("/invoices/{invoice_id}", response_model=InvoiceDto)
async def read_invoice(invoice_id: str, current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    scoped_id = internal_or_customer_account(current)
    stmt = invoice_stmt().where(Invoice.id == invoice_id)
    if scoped_id:
        stmt = stmt.where(Customer.account_id == scoped_id)
    row = (await db.execute(stmt)).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice_dto(*row)


@router.get("/customers/me/dashboard", response_model=DashboardDto)
async def customer_dashboard(current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    account = current["account"]
    if account.role != Role.CUSTOMER:
        raise HTTPException(status_code=403, detail="Customer account required")
    customer = await db.scalar(select(Customer).where(Customer.account_id == account.id))
    if customer is None:
        return DashboardDto(active_subscription_count=0, next_renewal_date=None, outstanding_balance_minor=0, currency="INR", recent_invoices=[])

    active_count = await db.scalar(
        select(func.count()).select_from(Subscription).where(
            Subscription.customer_id == customer.id, Subscription.status == "ACTIVE"
        )
    ) or 0
    paid_by_invoice = (
        select(Payment.invoice_id, func.sum(Payment.amount_minor).label("paid_minor"))
        .group_by(Payment.invoice_id)
        .subquery()
    )
    total_outstanding = await db.scalar(
        select(func.coalesce(func.sum(Invoice.amount_paise - func.coalesce(paid_by_invoice.c.paid_minor, 0)), 0))
        .join(Subscription, Invoice.subscription_id == Subscription.id)
        .outerjoin(paid_by_invoice, paid_by_invoice.c.invoice_id == Invoice.id)
        .where(Subscription.customer_id == customer.id, Invoice.paid.is_(False))
    ) or 0
    invoice_rows = (await db.execute(
        invoice_stmt().where(Customer.account_id == account.id)
        .order_by(Invoice.issued_at.desc(), Invoice.id).limit(5)
    )).all()
    return DashboardDto(
        active_subscription_count=active_count,
        next_renewal_date=None,
        outstanding_balance_minor=total_outstanding,
        currency="INR",
        recent_invoices=[invoice_dto(*row) for row in invoice_rows],
    )
