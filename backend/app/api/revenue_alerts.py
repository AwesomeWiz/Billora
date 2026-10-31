from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_db
from app.core.permissions import require_role
from app.models.account import Account, Role
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.subscription import Subscription

router = APIRouter(prefix="/alerts", tags=["Revenue Radar"])
read_access = require_role("ADMIN", "STAFF")


@router.get("/revenue-leaks")
async def revenue_leaks(
    severity: str | None = None, rule: str | None = None, search: str | None = None,
    current=Depends(read_access), db: AsyncSession = Depends(get_db),
):
    paid = (select(Payment.invoice_id, func.sum(Payment.amount_minor).label("paid_minor"))
            .group_by(Payment.invoice_id).subquery())
    rows = (await db.execute(
        select(Invoice, Subscription, Customer, Account, func.coalesce(paid.c.paid_minor, 0))
        .join(Subscription, Invoice.subscription_id == Subscription.id)
        .join(Customer, Subscription.customer_id == Customer.id)
        .join(Account, Customer.account_id == Account.id)
        .outerjoin(paid, paid.c.invoice_id == Invoice.id)
        .where(Invoice.paid.is_(False))
    )).all()
    now = datetime.now(timezone.utc)
    findings = []
    for invoice, subscription, customer, account, paid_minor in rows:
        balance = max(0, invoice.amount_paise - paid_minor)
        due = invoice.due_date
        due_utc = due.replace(tzinfo=timezone.utc) if due.tzinfo is None else due.astimezone(timezone.utc)
        if balance <= 0 or due_utc >= now:
            continue
        findings.append({
            "finding_key": f"INVOICE_OVERDUE:{invoice.id}", "rule": "INVOICE_OVERDUE",
            "severity": "HIGH", "title": "Invoice is overdue", "entity_type": "invoice",
            "entity_id": invoice.id,
            "explanation": "This invoice has an outstanding balance after its due date.",
            "suggested_action": "OPEN_INVOICE", "customer_name": customer.name or account.email,
            "customer_id": account.id, "detected_at": now.isoformat(),
            "amount_at_risk_minor": balance, "currency": "INR",
        })

    if severity:
        findings = [item for item in findings if item["severity"] == severity.upper()]
    if rule:
        findings = [item for item in findings if item["rule"] == rule.upper()]
    if search and search.strip():
        term = search.strip().casefold()
        findings = [item for item in findings if term in item["customer_name"].casefold()
                    or term in item["entity_id"].casefold()]
    return {
        "summary": {
            "overdue_invoice_count": len([f for f in findings if f["rule"] == "INVOICE_OVERDUE"]),
            "total_value_at_risk_minor": sum(f["amount_at_risk_minor"] for f in findings),
            "currency": "INR",
        },
        "findings": findings,
    }
