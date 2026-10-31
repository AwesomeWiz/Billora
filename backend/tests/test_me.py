# backend/tests/test_me.py
import pytest
from httpx import AsyncClient
from app.main import app
from app.core.security import hash_password
from app.models.account import Account, Role
from app.models.user import User
from app.core.db import AsyncSessionLocal

@pytest.fixture
async def auth_client():
    # create a CUSTOMER account for realistic scenario
    async with AsyncSessionLocal() as db:
        acct = Account(email="cust@test.com", role=Role.CUSTOMER)
        db.add(acct)
        await db.flush()
        user = User(account_id=acct.id, hashed_password=hash_password("pwd"))
        db.add(user)
        await db.commit()
    async with AsyncClient(app=app, base_url="http://test") as client:
        # acquire csrf token
        r = await client.get("/auth/csrf")
        csrf = r.json()["csrf_token"]
        # login
        await client.post(
            "/auth/login",
            json={"email": "cust@test.com", "password": "pwd"},
            headers={"X-CSRF-Token": csrf},
            cookies={"csrf_token": csrf},
        )
        token = client.cookies.get("session_token")
        client.cookies.set("session_token", token)
        client.cookies.set("csrf_token", csrf)
        client.headers.update({"X-CSRF-Token": csrf})
        return client

@pytest.mark.asyncio
async def test_me_returns_user_id(auth_client):
    client = await auth_client()
    r = await client.get("/auth/me")
    assert r.status_code == 200
    data = r.json()
    # ensure the user dict contains the id field and other expected keys
    user = data.get("user", {})
    assert "id" in user and isinstance(user["id"], str)
    assert "account_id" in user
    assert "email" in user
    assert "role" in user
    assert "csrf_token" in data
