import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.core.db import AsyncSessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.account import Account, Role
from app.models.customer import Customer
from app.models.user import User

API_PREFIX = "/api"
ALLOWED_ORIGIN = "http://localhost:5173"


async def create_customer() -> tuple[str, str]:
    email = f"customer-{uuid.uuid4().hex}@test.com"
    async with AsyncSessionLocal() as db:
        account = Account(email=email, role=Role.CUSTOMER)
        db.add(account)
        await db.flush()
        user = User(account_id=account.id, hashed_password=hash_password("pwd"))
        db.add(user)
        await db.commit()
        return account.id, email


async def authenticated_client(email: str) -> tuple[AsyncClient, str]:
    client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    response = await client.get(f"{API_PREFIX}/auth/csrf")
    assert response.status_code == 200
    csrf = response.json()["csrf_token"]
    response = await client.post(
        f"{API_PREFIX}/auth/login",
        json={"email": email, "password": "pwd"},
        headers={"X-CSRF-Token": csrf, "Origin": ALLOWED_ORIGIN},
    )
    assert response.status_code == 200
    client.headers.update({"X-CSRF-Token": csrf})
    return client, csrf


@pytest.mark.asyncio
async def test_customer_can_read_and_update_only_own_profile():
    account_id, email = await create_customer()
    client, csrf = await authenticated_client(email)
    try:
        response = await client.get(f"{API_PREFIX}/customers/me")
        assert response.status_code == 200, response.text
        assert response.json() == {
            "id": account_id,
            "email": email,
            "role": "CUSTOMER",
            "name": None,
        }

        response = await client.put(
            f"{API_PREFIX}/customers/me",
            json={"name": "  Ada Customer  "},
            headers={"X-CSRF-Token": csrf, "Origin": ALLOWED_ORIGIN},
        )
        assert response.status_code == 200, response.text
        assert response.json()["name"] == "Ada Customer"

        async with AsyncSessionLocal() as db:
            profile = await db.scalar(select(Customer).where(Customer.account_id == account_id))
            assert profile is not None
            assert profile.name == "Ada Customer"
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_customer_profile_update_requires_csrf_and_trusted_origin():
    _, email = await create_customer()
    client, csrf = await authenticated_client(email)
    try:
        response = await client.put(
            f"{API_PREFIX}/customers/me",
            json={"name": "Blocked"},
            headers={"X-CSRF-Token": "", "Origin": ALLOWED_ORIGIN},
        )
        assert response.status_code == 403

        response = await client.put(
            f"{API_PREFIX}/customers/me",
            json={"name": "Blocked"},
            headers={"X-CSRF-Token": csrf, "Origin": "http://evil.example"},
        )
        assert response.status_code == 403
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_staff_cannot_read_customer_profile():
    email = f"staff-{uuid.uuid4().hex}@test.com"
    async with AsyncSessionLocal() as db:
        account = Account(email=email, role=Role.STAFF)
        db.add(account)
        await db.flush()
        db.add(User(account_id=account.id, hashed_password=hash_password("pwd")))
        await db.commit()

    client, _ = await authenticated_client(email)
    try:
        response = await client.get(f"{API_PREFIX}/customers/me")
        assert response.status_code == 403
    finally:
        await client.aclose()
