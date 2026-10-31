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


async def invoice_for_customer():
    async with AsyncSessionLocal() as db:
        account = await db.scalar(select(Account).where(Account.email == "customer@example.com"))
        customer = Customer(account_id=account.id, name="Payment Customer")
        plan = Plan(
            name=f"Payment plan {uuid.uuid4()}",
            base_fee_minor=10000,
            currency="INR",
            billing_interval="MONTHLY",
            available_from=date(2026, 1, 1),
        )
        db.add_all([customer, plan])
        await db.flush()
        subscription = Subscription(customer_id=customer.id, plan_id=plan.id, status="ACTIVE")
        db.add(subscription)
        await db.flush()
        invoice = Invoice(
            subscription_id=subscription.id,
            amount_paise=10000,
            due_date=datetime.now(timezone.utc) + timedelta(days=5),
            paid=False,
        )
        db.add(invoice)
        await db.commit()
        return invoice.id


@pytest.mark.asyncio
async def test_payment_recording_is_partial_idempotent_and_reconciled(clients):
    invoice_id = await invoice_for_customer()
    admin = clients[Role.ADMIN.value]
    headers = {"Idempotency-Key": "payment-attempt-001"}
    body = {"invoice_id": invoice_id, "amount_minor": 4000, "method": "bank_transfer"}

    created = await admin.post("/api/payments", json=body, headers=headers)
    assert created.status_code == 201, created.text
    assert created.json()["amount_minor"] == 4000

    replay = await admin.post("/api/payments", json=body, headers=headers)
    assert replay.status_code == 201
    assert replay.json()["id"] == created.json()["id"]

    changed = await admin.post(
        "/api/payments",
        json={**body, "amount_minor": 5000},
        headers=headers,
    )
    assert changed.status_code == 409

    too_much = await admin.post(
        "/api/payments",
        json={**body, "amount_minor": 6001},
        headers={"Idempotency-Key": "payment-attempt-002"},
    )
    assert too_much.status_code == 422

    customer = clients[Role.CUSTOMER.value]
    invoice = (await customer.get(f"/api/invoices/{invoice_id}")).json()
    assert invoice["paid_minor"] == 4000
    assert invoice["balance_minor"] == 6000
    assert invoice["payment_status"] == "PARTIALLY_PAID"
    history = await customer.get(f"/api/invoices/{invoice_id}/payments")
    assert history.status_code == 200
    assert len(history.json()) == 1

    denied = await customer.post(
        "/api/payments",
        json={**body, "amount_minor": 6000},
        headers={"Idempotency-Key": "payment-attempt-003"},
    )
    assert denied.status_code == 403

    final = await admin.post(
        "/api/payments",
        json={**body, "amount_minor": 6000},
        headers={"Idempotency-Key": "payment-attempt-004"},
    )
    assert final.status_code == 201, final.text
    invoice = (await customer.get(f"/api/invoices/{invoice_id}")).json()
    assert invoice["paid_minor"] == 10000
    assert invoice["balance_minor"] == 0
    assert invoice["payment_status"] == "PAID"
