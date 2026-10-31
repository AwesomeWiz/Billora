
import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.core.db import AsyncSessionLocal
from app.core.security import hash_password
from app.models.account import Account, Role
from app.models.user import User


ALLOWED_ORIGIN = "http://localhost:5173"
API_PREFIX = "/api"


async def login_client(client: AsyncClient, email: str, password: str = "pwd") -> str:
    # Obtain a CSRF token and let the client store its cookie.
    response = await client.get(f"{API_PREFIX}/auth/csrf")
    assert response.status_code == 200, (
        f"CSRF endpoint failed: {response.status_code} {response.text}"
    )

    csrf = response.json()["csrf_token"]

    # Log in with the required CSRF and Origin headers.
    response = await client.post(
        f"{API_PREFIX}/auth/login",
        json={"email": email, "password": password},
        headers={
            "X-CSRF-Token": csrf,
            "Origin": ALLOWED_ORIGIN,
        },
    )
    assert response.status_code == 200, (
        f"Login failed: {response.status_code} {response.text}"
    )

    client.headers.update({"X-CSRF-Token": csrf})
    return csrf


async def create_test_user(role: Role) -> str:
    """Create a user with a unique email and return that email."""
    email = f"{role.value.lower()}-{uuid.uuid4().hex}@test.com"

    async with AsyncSessionLocal() as db:
        account = Account(email=email, role=role)
        db.add(account)
        await db.flush()

        user = User(
            account_id=account.id,
            hashed_password=hash_password("pwd"),
        )
        db.add(user)
        await db.commit()

    return email


@pytest_asyncio.fixture
async def admin_cookies():
    email = await create_test_user(Role.ADMIN)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        csrf = await login_client(client, email)
        yield client, csrf


@pytest.mark.asyncio
async def test_product_mutation_requires_csrf_and_origin(admin_cookies):
    client, csrf = admin_cookies

    payload = {
        "name": "Test Product",
        "type": "s",
        "sales_price_minor": 1000,
        "cost_price_minor": 800,
    }

    # Missing CSRF header should be rejected.
    response = await client.post(
        f"{API_PREFIX}/products",
        json=payload,
        headers={
            "X-CSRF-Token": "",
            "Origin": ALLOWED_ORIGIN,
        },
    )
    assert response.status_code == 403, response.text

    # A disallowed Origin should be rejected.
    response = await client.post(
        f"{API_PREFIX}/products",
        json=payload,
        headers={
            "X-CSRF-Token": csrf,
            "Origin": "http://evil.com",
        },
    )
    assert response.status_code == 403, response.text

    # Valid CSRF token and Origin should allow an ADMIN to create a product.
    response = await client.post(
        f"{API_PREFIX}/products",
        json=payload,
        headers={
            "X-CSRF-Token": csrf,
            "Origin": ALLOWED_ORIGIN,
        },
    )
    assert response.status_code == 201, response.text


@pytest.mark.asyncio
async def test_customer_cannot_mutate():
    email = await create_test_user(Role.CUSTOMER)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        csrf = await login_client(client, email)

        # A CUSTOMER must not be allowed to create a product.
        response = await client.post(
            f"{API_PREFIX}/products",
            json={
                "name": "Forbidden Product",
                "type": "s",
                "sales_price_minor": 10,
                "cost_price_minor": 5,
            },
            headers={
                "X-CSRF-Token": csrf,
                "Origin": ALLOWED_ORIGIN,
            },
        )

        assert response.status_code == 403, response.text
