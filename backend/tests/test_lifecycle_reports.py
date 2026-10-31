import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.core.db import AsyncSessionLocal
from app.models.account import Account, Role
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.plan import Plan
from app.models.subscription import Subscription


async def setup_lifecycle_rows():
    async with AsyncSessionLocal() as db:
        account = await db.scalar(select(Account).where(Account.email == "customer@example.com"))
        customer = Customer(account_id=account.id, name="Lifecycle Customer")
        plan = Plan(
            name=f"Lifecycle {uuid.uuid4()}", base_fee_minor=12000, bill_plan_base_fee=True,
            currency="INR", billing_interval="MONTHLY", available_from=date(2026, 1, 1),
            can_pause=True, can_renew=True, can_close_early=True,
        )
        db.add_all([customer, plan])
        await db.flush()
        confirmed = Subscription(customer_id=customer.id, plan_id=plan.id, status="CONFIRMED")
        active = Subscription(customer_id=customer.id, plan_id=plan.id, status="ACTIVE")
        db.add_all([confirmed, active])
        await db.flush()
        invoice = Invoice(
            subscription_id=active.id, amount_paise=8000,
            due_date=datetime.now(timezone.utc) - timedelta(days=2),
            paid=False, status="DRAFT",
        )
        db.add(invoice)
        await db.commit()
        return confirmed.id, active.id, invoice.id


@pytest.mark.asyncio
async def test_subscription_transition_and_invoice_lifecycle(clients):
    confirmed_id, _, invoice_id = await setup_lifecycle_rows()
    staff = clients[Role.STAFF.value]
    invalid = await staff.post(
        f"/api/subscriptions/{confirmed_id}/transition", json={"to_status": "PAUSED"}
    )
    assert invalid.status_code == 409
    activate = await staff.post(
        f"/api/subscriptions/{confirmed_id}/transition", json={"to_status": "ACTIVE"}
    )
    assert activate.status_code == 200, activate.text
    assert activate.json()["next_billing_date"] is not None

    confirmed_invoice = await staff.post(f"/api/invoices/{invoice_id}/confirm")
    assert confirmed_invoice.status_code == 200
    sent = await staff.post(f"/api/invoices/{invoice_id}/send", json={})
    assert sent.status_code == 200
    assert sent.json()["delivery_state"] == "PREVIEW_ONLY"
    cancelled = await staff.post(f"/api/invoices/{invoice_id}/cancel")
    assert cancelled.status_code == 200
    paid_attempt = await staff.post(
        "/api/payments",
        json={"invoice_id": invoice_id, "amount_minor": 1, "method": "cash"},
        headers={"Idempotency-Key": "cancelled-payment-001"},
    )
    assert paid_attempt.status_code == 409


@pytest.mark.asyncio
async def test_reports_use_recorded_invoice_payment_data(clients):
    _, active_id, invoice_id = await setup_lifecycle_rows()
    staff = clients[Role.STAFF.value]
    await staff.post(f"/api/invoices/{invoice_id}/confirm")
    payment = await staff.post(
        "/api/payments",
        json={"invoice_id": invoice_id, "amount_minor": 3000, "method": "bank"},
        headers={"Idempotency-Key": "report-payment-0001"},
    )
    assert payment.status_code == 201
    summary = await staff.get("/api/reports/summary")
    assert summary.status_code == 200, summary.text
    assert summary.json()["collected_minor"] == 3000
    assert summary.json()["confirmed_invoiced_minor"] == 8000
    assert summary.json()["outstanding_minor"] == 5000
    overdue = await staff.get("/api/reports/overdue")
    assert overdue.status_code == 200
    assert any(row["invoice_id"] == invoice_id and row["balance_minor"] == 5000
               for row in overdue.json()["items"])
