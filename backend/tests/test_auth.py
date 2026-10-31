# backend/tests/test_auth.py
import pytest
import secrets
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_auth_flow():
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        # 1. Get CSRF token
        csrf_resp = await client.get("/auth/csrf")
        assert csrf_resp.status_code == 200
        csrf_data = csrf_resp.json()
        csrf_token = csrf_data["csrf_token"]
        # Extract cookie set by server
        csrf_cookie = csrf_resp.cookies.get("csrf_token")
        assert csrf_cookie == csrf_token

        headers = {"X-CSRF-Token": csrf_token}
        # 2. Register a unique user
        email = f"test_{secrets.token_hex(4)}@example.com"
        password = "Aa1!secure"
        register_resp = await client.post(
            "/auth/register",
            json={"email": email, "password": password},
            headers=headers,
            cookies={"csrf_token": csrf_token},
        )
        assert register_resp.status_code == 200
        reg_json = register_resp.json()
        assert reg_json["account_id"]
        assert reg_json["user_id"]
        assert reg_json["role"] == "CUSTOMER"

        # 3. Login
        login_resp = await client.post(
            "/auth/login",
            json={"email": email, "password": password},
            headers=headers,
            cookies={"csrf_token": csrf_token},
        )
        assert login_resp.status_code == 200
        login_json = login_resp.json()
        assert login_json["detail"] == "logged in"
        # Session cookie should be set
        session_cookie = login_resp.cookies.get("session_token")
        assert session_cookie

        # 4. Get current user
        me_resp = await client.get(
            "/auth/me",
            cookies={"session_token": session_cookie, "csrf_token": csrf_token},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert me_resp.status_code == 200
        me_data = me_resp.json()
        assert "user" in me_data and "csrf_token" in me_data
        assert me_data["user"]["email"] == email

        # 5. Logout
        logout_resp = await client.post(
            "/auth/logout",
            cookies={"session_token": session_cookie, "csrf_token": csrf_token},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert logout_resp.status_code == 200
        assert logout_resp.json()["detail"] == "logged out"

        # 6. Verify session cleared
        me_after_resp = await client.get(
            "/auth/me",
            cookies={"session_token": session_cookie, "csrf_token": csrf_token},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert me_after_resp.status_code == 401
