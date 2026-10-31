import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.db import AsyncSessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.account import Account, Role
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User

API_PREFIX = "/api"
ALLOWED_ORIGIN = "http://localhost:5173"


async def create_customer_records():
    token = uuid.uuid4().hex
    email = f"billing-{token}@test.com"
    async with AsyncSessionLocal() as db:
        account = Account(email=email, role=Role.CUSTOMER)
        db.add(account)
        await db.flush()
        customer = Customer(account_id=account.id, name=f"Customer {token}")
        user = User(account_id=account.id, hashed_password=hash_password("pwd"))
        plan = Plan(
            name=f"Billing plan {token}",
            base_fee_minor=12500,
            bill_plan_base_fee=True,
            currency="INR",
            billing_interval="MONTHLY",
            available_from=date(2026, 1, 1),
        )
        db.add_all([customer, user, plan])
        await db.flush()
        subscription = Subscription(customer_id=customer.id, plan_id=plan.id, status="ACTIVE")
        db.add(subscription)
        await db.flush()
        unpaid = Invoice(
            subscription_id=subscription.id,
            amount_paise=3500,
            due_date=datetime.now(timezone.utc) + timedelta(days=14),
            paid=False,
        )
        paid = Invoice(
            subscription_id=subscription.id,
            amount_paise=1200,
            due_date=datetime.now(timezone.utc) + timedelta(days=14),
            paid=True,
        )
        db.add_all([unpaid, paid])
        await db.commit()
        await db.refresh(unpaid)
        return {
            "email": email,
            "account_id": account.id,
            "subscription_id": subscription.id,
            "invoice_id": unpaid.id,
            "paid_invoice_id": paid.id,
        }


async def customer_client(email: str):
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    response = await client.get(f"{API_PREFIX}/auth/csrf")
    csrf = response.json()["csrf_token"]
    response = await client.post(
        f"{API_PREFIX}/auth/login",
        json={"email": email, "password": "pwd"},
        headers={"X-CSRF-Token": csrf, "Origin": ALLOWED_ORIGIN},
    )
    assert response.status_code == 200
    client.headers.update({"X-CSRF-Token": csrf})
    return client


@pytest.mark.asyncio
async def test_customer_billing_reads_are_scoped_and_dashboard_uses_integer_paise():
    own = await create_customer_records()
    other = await create_customer_records()
    client = await customer_client(own["email"])
    try:
        response = await client.get(f"{API_PREFIX}/accounts/{own['account_id']}")
        assert response.status_code == 200, response.text
        assert response.json()["billing_email"] == own["email"]
        response = await client.get(f"{API_PREFIX}/accounts/{other['account_id']}")
        assert response.status_code == 404
        response = await client.get(f"{API_PREFIX}/accounts")
        assert response.status_code == 403

        response = await client.get(f"{API_PREFIX}/subscriptions")
        assert response.status_code == 200, response.text
        subscriptions = response.json()
        assert subscriptions["total"] == 1
        assert subscriptions["items"][0]["id"] == own["subscription_id"]
        assert subscriptions["items"][0]["account_id"] == own["account_id"]
        assert subscriptions["items"][0]["recurring_amount_minor"] == 12500
        assert subscriptions["items"][0]["next_billing_date"] is None

        response = await client.get(f"{API_PREFIX}/subscriptions/{other['subscription_id']}")
        assert response.status_code == 404

        response = await client.get(f"{API_PREFIX}/invoices")
        assert response.status_code == 200, response.text
        invoices = response.json()
        assert invoices["total"] == 2
        assert {item["id"] for item in invoices["items"]} == {
            own["invoice_id"],
            own["paid_invoice_id"],
        }
        unpaid = next(item for item in invoices["items"] if item["id"] == own["invoice_id"])
        assert unpaid["total_minor"] == 3500
        assert unpaid["paid_minor"] == 0
        assert unpaid["balance_minor"] == 3500

        response = await client.get(f"{API_PREFIX}/invoices/{other['invoice_id']}")
        assert response.status_code == 404

        response = await client.get(f"{API_PREFIX}/customers/me/dashboard")
        assert response.status_code == 200, response.text
        dashboard = response.json()
        assert dashboard["active_subscription_count"] == 1
        assert dashboard["next_renewal_date"] is None
        assert dashboard["outstanding_balance_minor"] == 3500
        assert len(dashboard["recent_invoices"]) == 2
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_customer_cannot_override_own_account_filter():
    own = await create_customer_records()
    other = await create_customer_records()
    client = await customer_client(own["email"])
    try:
        response = await client.get(
            f"{API_PREFIX}/subscriptions",
            params={"customer_id": other["account_id"]},
        )
        assert response.status_code == 404
        response = await client.get(
            f"{API_PREFIX}/invoices",
            params={"account_id": other["account_id"]},
        )
        assert response.status_code == 404
    finally:
        await client.aclose()
