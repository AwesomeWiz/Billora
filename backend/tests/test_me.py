import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.db import AsyncSessionLocal
from app.core.security import hash_password
from app.main import app
from app.models.account import Account, Role
from app.models.user import User

API_PREFIX = "/api"
ALLOWED_ORIGIN = "http://localhost:5173"


@pytest.mark.asyncio
async def test_me_returns_user_id():
    email = f"customer-{uuid.uuid4().hex}@test.com"
    async with AsyncSessionLocal() as db:
        account = Account(email=email, role=Role.CUSTOMER)
        db.add(account)
        await db.flush()
        user = User(account_id=account.id, hashed_password=hash_password("pwd"))
        db.add(user)
        await db.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        csrf_response = await client.get(f"{API_PREFIX}/auth/csrf")
        assert csrf_response.status_code == 200, csrf_response.text
        csrf = csrf_response.json()["csrf_token"]

        login_response = await client.post(
            f"{API_PREFIX}/auth/login",
            json={"email": email, "password": "pwd"},
            headers={
                "X-CSRF-Token": csrf,
                "Origin": ALLOWED_ORIGIN,
            },
        )
        assert login_response.status_code == 200, login_response.text
        client.headers.update({"X-CSRF-Token": csrf})

        response = await client.get(f"{API_PREFIX}/auth/me")
        assert response.status_code == 200, response.text
        data = response.json()
        user_data = data["user"]
        assert user_data["id"] == user.id
        assert user_data["account_id"] == account.id
        assert user_data["email"] == email
        assert user_data["role"] == Role.CUSTOMER.value
        assert data["csrf_token"] == csrf
