from calendar import monthrange
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, verify_csrf, verify_origin
from app.api.billing_reads import get_db
from app.core.permissions import require_role
from app.models.account import Account, Role
from app.models.activity import ActivityEvent
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.subscription import Subscription

router = APIRouter(tags=["Billing lifecycle and reports"])
staff_access = require_role("ADMIN", "STAFF")
mutation_checks = [Depends(verify_csrf), Depends(verify_origin)]
BUSINESS_TZ = timezone(timedelta(hours=5, minutes=30))


class TransitionInput(BaseModel):
    to_status: str


def next_billing_date(start: date, interval: str) -> date:
    if interval == "DAILY":
        return start + timedelta(days=1)
    if interval == "WEEKLY":
        return start + timedelta(days=7)
    if interval == "YEARLY":
        year, month = start.year + 1, start.month
        return date(year, month, min(start.day, monthrange(year, month)[1]))
    if interval == "MONTHLY":
        year, month = (start.year + (start.month == 12), 1 if start.month == 12 else start.month + 1)
        return date(year, month, min(start.day, monthrange(year, month)[1]))
    raise HTTPException(422, "Unsupported plan billing interval")


@router.post("/subscriptions/{subscription_id}/transition", dependencies=mutation_checks)
async def transition_subscription(
    subscription_id: str, payload: TransitionInput,
    current=Depends(staff_access), db: AsyncSession = Depends(get_db),
):
    subscription = await db.get(Subscription, subscription_id)
    if subscription is None:
        raise HTTPException(404, "Subscription not found")
    plan = await db.get(Plan, subscription.plan_id)
    source, target = subscription.status, payload.to_status.upper()
    allowed = {
        "DRAFT": {"QUOTATION", "CLOSED"},
        "QUOTATION": {"CLOSED"},
        "CONFIRMED": {"ACTIVE", "CLOSED"},
        "ACTIVE": {"PAUSED", "CLOSED"},
        "PAUSED": {"ACTIVE", "CLOSED"},
        "CANCELED": set(),
        "EXPIRED": set(),
        "CLOSED": set(),
    }
    if target not in allowed.get(source, set()):
        raise HTTPException(409, detail={"code": "INVALID_SUBSCRIPTION_TRANSITION", "message": f"{source} cannot transition to {target}"})
    if source == "ACTIVE" and target == "PAUSED" and not plan.can_pause:
        raise HTTPException(409, "Plan does not permit pausing")
    if source in {"ACTIVE", "PAUSED"} and target == "CLOSED" and not plan.can_close_early:
        raise HTTPException(409, "Plan does not permit early closure")
    now = datetime.now(BUSINESS_TZ)
    if source == "CONFIRMED" and target == "ACTIVE":
        if not plan.active or plan.available_from > now.date() or (
            plan.available_to is not None and plan.available_to < now.date()
        ):
            raise HTTPException(409, "Plan is not currently available")
        subscription.start_date = now.replace(tzinfo=None)
        subscription.next_billing_date = next_billing_date(now.date(), plan.billing_interval)
    elif source == "PAUSED" and target == "ACTIVE":
        if not plan.can_renew:
            raise HTTPException(409, "Plan does not permit resuming")
        if subscription.next_billing_date is None:
            raise HTTPException(409, "Subscription has no persisted billing anchor")
    if target == "CLOSED":
        subscription.end_date = now.replace(tzinfo=None)
        subscription.next_billing_date = None
    subscription.status = target
    db.add(ActivityEvent(
        event_type="SUBSCRIPTION_TRANSITION", entity_type="subscription",
        entity_id=subscription.id, actor_id=current["user"].id, actor_kind="USER",
        account_id=await db.scalar(select(Customer.account_id).where(Customer.id == subscription.customer_id)),
        summary=f"Subscription changed from {source} to {target}.",
    ))
    await db.commit()
    return {
        "id": subscription.id, "status": subscription.status,
        "next_billing_date": subscription.next_billing_date,
        "end_date": subscription.end_date,
    }


async def invoice_balance(db: AsyncSession, invoice: Invoice) -> tuple[int, int]:
    paid = await db.scalar(select(func.coalesce(func.sum(Payment.amount_minor), 0)).where(
        Payment.invoice_id == invoice.id
    )) or 0
    if invoice.paid:
        paid = invoice.amount_paise
    return paid, max(0, invoice.amount_paise - paid)


@router.post("/invoices/{invoice_id}/confirm", dependencies=mutation_checks)
async def confirm_invoice(invoice_id: str, current=Depends(staff_access), db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(404, "Invoice not found")
    if invoice.status != "DRAFT":
        raise HTTPException(409, "Only draft invoices can be confirmed")
    invoice.status = "CONFIRMED"
    await db.commit()
    return {"id": invoice.id, "status": invoice.status}


@router.post("/invoices/{invoice_id}/cancel", dependencies=mutation_checks)
async def cancel_invoice(invoice_id: str, current=Depends(staff_access), db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(404, "Invoice not found")
    paid, _ = await invoice_balance(db, invoice)
    if invoice.status != "CONFIRMED" or paid > 0:
        raise HTTPException(409, "Only unpaid confirmed invoices can be cancelled")
    invoice.status = "CANCELLED"
    await db.commit()
    return {"id": invoice.id, "status": invoice.status}


@router.post("/invoices/{invoice_id}/send", dependencies=mutation_checks)
async def send_invoice(invoice_id: str, current=Depends(staff_access), db: AsyncSession = Depends(get_db)):
    invoice = await db.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(404, "Invoice not found")
    if invoice.status not in {"CONFIRMED", "PAID"}:
        raise HTTPException(409, "Only confirmed invoices can be sent")
    return {"invoice_id": invoice.id, "delivery_state": "PREVIEW_ONLY", "sent": False}


@router.get("/invoices/{invoice_id}/print", response_class=HTMLResponse)
async def print_invoice(invoice_id: str, current=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Invoice, Account, Customer)
        .join(Subscription, Invoice.subscription_id == Subscription.id)
        .join(Customer, Subscription.customer_id == Customer.id)
        .join(Account, Customer.account_id == Account.id)
        .where(Invoice.id == invoice_id)
    )
    row = (await db.execute(stmt)).first()
    if row is None:
        raise HTTPException(404, "Invoice not found")
    invoice, account, customer = row
    if current["account"].role == Role.CUSTOMER and account.id != current["account"].id:
        raise HTTPException(404, "Invoice not found")
    if current["account"].role not in (Role.CUSTOMER, Role.ADMIN, Role.STAFF):
        raise HTTPException(403, "Insufficient permissions")
    _, balance = await invoice_balance(db, invoice)
    return (
        "<!doctype html><html><head><meta charset='utf-8'><title>Invoice</title></head><body>"
        f"<h1>Invoice {invoice.id}</h1><p>{customer.name} &lt;{account.email}&gt;</p>"
        f"<p>Status: {invoice.status}</p><p>Total: {invoice.amount_paise} paise</p>"
        f"<p>Balance: {balance} paise</p><p>Due: {invoice.due_date.isoformat()}</p>"
        "</body></html>"
    )


@router.get("/reports/summary")
async def report_summary(
    from_date: date | None = None, to_date: date | None = None,
    current=Depends(staff_access), db: AsyncSession = Depends(get_db),
):
    if from_date and to_date and from_date > to_date:
        raise HTTPException(422, "from_date must not be after to_date")
    stmt = select(Invoice).where(Invoice.status.in_(("CONFIRMED", "PAID")))
    if from_date:
        stmt = stmt.where(func.date(Invoice.issued_at) >= from_date.isoformat())
    if to_date:
        stmt = stmt.where(func.date(Invoice.issued_at) <= to_date.isoformat())
    invoices = (await db.scalars(stmt)).all()
    invoice_ids = [invoice.id for invoice in invoices]
    paid_map = {}
    if invoice_ids:
        paid_map = dict((await db.execute(
            select(Payment.invoice_id, func.sum(Payment.amount_minor))
            .where(Payment.invoice_id.in_(invoice_ids)).group_by(Payment.invoice_id)
        )).all())
    collected = sum(invoice.amount_paise if invoice.paid else paid_map.get(invoice.id, 0) for invoice in invoices)
    invoiced = sum(invoice.amount_paise for invoice in invoices)
    today = datetime.now(BUSINESS_TZ).date()
    overdue = [
        invoice for invoice in invoices
        if invoice.status == "CONFIRMED" and invoice.due_date.date() < today
        and invoice.amount_paise > (invoice.amount_paise if invoice.paid else paid_map.get(invoice.id, 0))
    ]
    active_count = await db.scalar(select(func.count()).select_from(Subscription).where(Subscription.status == "ACTIVE")) or 0
    overdue_balance = sum(
        max(0, invoice.amount_paise - (invoice.amount_paise if invoice.paid else paid_map.get(invoice.id, 0)))
        for invoice in overdue
    )
    return {
        "active_subscription_count": active_count,
        "collected_minor": collected,
        "confirmed_invoiced_minor": invoiced,
        "outstanding_minor": max(0, invoiced - collected),
        "overdue_count": len(overdue), "overdue_minor": overdue_balance,
        "from_date": from_date, "to_date": to_date, "currency": "INR",
    }


@router.get("/reports/overdue")
async def report_overdue(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    current=Depends(staff_access), db: AsyncSession = Depends(get_db),
):
    today = datetime.now(BUSINESS_TZ).date()
    invoices = (await db.scalars(
        select(Invoice).where(
            Invoice.status == "CONFIRMED", Invoice.due_date < datetime.combine(today, datetime.min.time()),
        ).order_by(Invoice.due_date, Invoice.id)
    )).all()
    rows = []
    for invoice in invoices:
        paid, balance = await invoice_balance(db, invoice)
        if balance:
            rows.append({"invoice_id": invoice.id, "due_date": invoice.due_date,
                         "total_minor": invoice.amount_paise, "paid_minor": paid,
                         "balance_minor": balance})
    return {
        "items": rows[(page - 1) * page_size:page * page_size],
        "total": len(rows), "page": page, "page_size": page_size,
        "has_next": page * page_size < len(rows),
    }
