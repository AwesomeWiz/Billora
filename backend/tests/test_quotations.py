import uuid
from datetime import date

import pytest
from sqlalchemy import select

from app.core.db import AsyncSessionLocal
from app.models.account import Account, Role
from app.models.customer import Customer
from app.models.plan import Plan
from app.models.product import Product
from app.models.product_variant import ProductVariant


async def quotation_fixture():
    async with AsyncSessionLocal() as db:
        account = await db.scalar(select(Account).where(Account.email == "customer@example.com"))
        customer = Customer(account_id=account.id, name="Quotation Customer")
        plan = Plan(
            name=f"Quotation plan {uuid.uuid4()}", base_fee_minor=0, currency="INR",
            billing_interval="MONTHLY", available_from=date(2026, 1, 1),
        )
        product = Product(
            name=f"Catalog product {uuid.uuid4()}", type="service",
            sales_price_minor=150000, cost_price_minor=0, currency="INR", active=True,
        )
        db.add_all([customer, plan, product])
        await db.flush()
        variant = ProductVariant(
            product_id=product.id, name="Odoo", price_adjust_minor=56000, active=True,
        )
        db.add(variant)
        await db.commit()
        return account.id, plan.id, product.id, variant.id


@pytest.mark.asyncio
async def test_quotation_templates_and_acceptance_use_catalog_price(clients):
    account_id, plan_id, product_id, variant_id = await quotation_fixture()
    admin = clients[Role.ADMIN.value]
    template = await admin.post(
        "/api/quotation-templates",
        json={
            "name": "Odoo setup",
            "plan_id": plan_id,
            "validity_days": 14,
            "lines": [{"product_id": product_id, "variant_id": variant_id, "quantity": 2}],
        },
    )
    assert template.status_code == 201, template.text
    assert template.json()["lines"][0]["unit_price_minor"] == 206000

    created = await admin.post(
        "/api/quotations",
        json={
            "account_id": account_id,
            "template_id": template.json()["id"],
            "plan_id": plan_id,
            "validity_days": 30,
            "lines": [{
                "source_product_id": product_id,
                "variant_id": variant_id,
                "quantity": 2,
                "unit_price_minor": 206000,
            }],
        },
    )
    assert created.status_code == 201, created.text
    quote = created.json()
    assert quote["subtotal_minor"] == 412000
    assert quote["tax_minor"] == 0
    assert quote["status"] == "ISSUED"
    assert quote["subscription"]["status"] == "QUOTATION"

    accepted = await admin.post(f"/api/quotations/{quote['id']}/confirm")
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["status"] == "ACCEPTED"
    assert accepted.json()["subscription"]["status"] == "CONFIRMED"

    price_mismatch = await admin.post(
        "/api/quotations",
        json={
            "account_id": account_id,
            "plan_id": plan_id,
            "lines": [{
                "source_product_id": product_id,
                "quantity": 1,
                "unit_price_minor": 1,
            }],
        },
    )
    assert price_mismatch.status_code == 422
