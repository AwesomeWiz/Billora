import hashlib
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, verify_csrf, verify_origin
from app.core.db import AsyncSessionLocal
from app.models.account import Role
from app.models.activity import ActivityEvent
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.subscription import Subscription
from app.schemas.payments import PaymentCreate, PaymentDto

router = APIRouter(tags=["Payments"])


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db


async def get_invoice_for_account(db: AsyncSession, invoice_id: str, account_id: str | None):
    stmt = (
        select(Invoice)
        .join(Subscription, Invoice.subscription_id == Subscription.id)
        .join(Customer, Subscription.customer_id == Customer.id)
        .where(Invoice.id == invoice_id)
    )
    if account_id is not None:
        stmt = stmt.where(Customer.account_id == account_id)
    return await db.scalar(stmt)


@router.post(
    "/payments",
    response_model=PaymentDto,
    status_code=201,
    dependencies=[Depends(verify_csrf), Depends(verify_origin)],
)
async def record_payment(
    payload: PaymentCreate,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=8, max_length=128),
    current=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current["account"].role not in (Role.ADMIN, Role.STAFF):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    request_hash = hashlib.sha256(
        json.dumps(payload.model_dump(), sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()

    try:
        # Serialize payment balance checks so simultaneous requests cannot overpay.
        await db.execute(text("BEGIN IMMEDIATE"))
        prior = await db.scalar(select(Payment).where(Payment.idempotency_key == idempotency_key))
        if prior:
            if prior.request_hash != request_hash:
                raise HTTPException(status_code=409, detail="Idempotency key reused with different request")
            await db.commit()
            return prior

        invoice = await get_invoice_for_account(db, payload.invoice_id, None)
        if invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice.paid:
            raise HTTPException(status_code=409, detail="Invoice is not collectible")

        recorded = await db.scalar(
            select(func.coalesce(func.sum(Payment.amount_minor), 0)).where(Payment.invoice_id == invoice.id)
        ) or 0
        balance = invoice.amount_paise - recorded
        if payload.amount_minor > balance:
            raise HTTPException(status_code=422, detail="Payment exceeds invoice balance")

        payment = Payment(
            invoice_id=invoice.id,
            amount_minor=payload.amount_minor,
            method=payload.method.strip(),
            note=payload.note,
            recorded_by=current["user"].id,
            idempotency_key=idempotency_key,
            request_hash=request_hash,
        )
        db.add(payment)
        account_id = await db.scalar(
            select(Customer.account_id)
            .join(Subscription, Subscription.customer_id == Customer.id)
            .where(Subscription.id == invoice.subscription_id)
        )
        db.add(ActivityEvent(
            event_type="PAYMENT_RECORDED", entity_type="invoice", entity_id=invoice.id,
            actor_id=current["user"].id, actor_kind="USER", account_id=account_id,
            summary=f"Payment of {payload.amount_minor} paise recorded for invoice.",
        ))
        if payload.amount_minor == balance:
            invoice.paid = True
        await db.commit()
        await db.refresh(payment)
        return payment
    except HTTPException:
        await db.rollback()
        raise
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Payment conflicts with an existing record") from exc


@router.get("/invoices/{invoice_id}/payments", response_model=list[PaymentDto])
async def list_invoice_payments(
    invoice_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=100),
    current=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    role = current["account"].role
    account_id = current["account"].id if role == Role.CUSTOMER else None
    if role not in (Role.ADMIN, Role.STAFF, Role.CUSTOMER):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    invoice = await get_invoice_for_account(db, invoice_id, account_id)
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    result = await db.scalars(
        select(Payment)
        .where(Payment.invoice_id == invoice_id)
        .order_by(Payment.recorded_at.desc(), Payment.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return result.all()
