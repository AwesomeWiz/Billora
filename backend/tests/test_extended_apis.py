import uuid
from datetime import date, datetime

import pytest
from sqlalchemy import select

from app.core.db import AsyncSessionLocal
from app.models.account import Account, Role
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.plan import Plan
from app.models.subscription import Subscription


@pytest.mark.asyncio
async def test_tax_access_alerts_activity_notifications_and_gst_settings(clients):
    admin = clients[Role.ADMIN.value]
    staff = clients[Role.STAFF.value]
    customer = clients[Role.CUSTOMER.value]

    created = await admin.post(
        "/api/taxes",
        json={
            "name": "GST 5%",
            "rate_bps": 500,
            "scope": "GLOBAL",
            "effective_from": "2026-01-01",
            "active": True,
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["rate_bps"] == 500
    assert (await staff.get("/api/taxes")).status_code == 200
    assert (await staff.post("/api/taxes", json=created.json())).status_code == 403
    assert (await customer.get("/api/alerts/revenue-leaks")).status_code == 403

    assert (await staff.get("/api/alerts/revenue-leaks")).json()["findings"] == []
    assert (await customer.get("/api/events")).status_code == 200
    assert (await customer.get("/api/notifications")).status_code == 200

    settings = await admin.get("/api/gst/settings")
    assert settings.status_code == 200
    patched = await admin.patch(
        "/api/gst/settings",
        json={"gstin": "29ABCDE1234F1Z5", "legal_business_name": "Demo Company"},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["gstin"] == "29ABCDE1234F1Z5"
    intelligence = await admin.get("/api/gst/intelligence")
    assert intelligence.status_code == 200
    assert intelligence.json()["tax_snapshot_data_available"] is False
    assert (await admin.get("/api/gst/errors")).json()["items"] == []
    assert (await admin.post("/api/gst/errors/nonexistent/approve", json={})).status_code == 404


@pytest.mark.asyncio
async def test_revenue_alerts_report_real_overdue_balance(clients):
    async with AsyncSessionLocal() as db:
        account = await db.scalar(select(Account).where(Account.email == "customer@example.com"))
        customer = Customer(account_id=account.id, name="Overdue Customer")
        plan = Plan(
            name=f"Alert plan {uuid.uuid4()}", base_fee_minor=1000, currency="INR",
            billing_interval="MONTHLY", available_from=date(2026, 1, 1),
        )
        db.add_all([customer, plan])
        await db.flush()
        subscription = Subscription(customer_id=customer.id, plan_id=plan.id, status="ACTIVE")
        db.add(subscription)
        await db.flush()
        invoice = Invoice(
            subscription_id=subscription.id, amount_paise=12345,
            due_date=datetime(2026, 1, 1),
            paid=False,
        )
        db.add(invoice)
        await db.commit()
        invoice_id = invoice.id

    result = await clients[Role.STAFF.value].get("/api/alerts/revenue-leaks")
    assert result.status_code == 200
    finding = next(item for item in result.json()["findings"] if item["entity_id"] == invoice_id)
    assert finding["rule"] == "INVOICE_OVERDUE"
    assert finding["amount_at_risk_minor"] == 12345
    assert result.json()["summary"]["total_value_at_risk_minor"] == 12345
