# backend/tests/conftest.py
import sys
import os
import tempfile
from pathlib import Path

# Set before any application import. Never run tests against billora.db or .env.
_test_directory = tempfile.TemporaryDirectory(prefix="billora-pytest-")
_test_path = Path(_test_directory.name) / "test.db"
os.environ["SQLITE_URL"] = "sqlite+aiosqlite:///" + _test_path.as_posix()

# Add the project root (backend) to PYTHONPATH so that imports like
# `from app.main import app` work when pytest is invoked from the repository root.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from app.main import app, on_startup
from app.core.db import engine, Base, AsyncSessionLocal
from app.core.security import hash_password
from app.models.account import Account, Role
from app.models.user import User


@pytest_asyncio.fixture(autouse=True)
async def isolated_schema():
    assert Path(engine.url.database).resolve() == _test_path.resolve(), "Refusing to initialize or clear a non-test database"
    await on_startup()
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def clients():
    """Persist real test actors and authenticate through cookie/CSRF endpoints."""
    result = {}
    for role in Role:
        email = f"{role.value.lower()}@example.com"
        async with AsyncSessionLocal() as db:
            account = Account(email=email, role=role)
            db.add(account)
            await db.flush()
            db.add(User(account_id=account.id, hashed_password=hash_password("Test-password!")))
            await db.commit()
        client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
        csrf = (await client.get("/api/auth/csrf")).json()["csrf_token"]
        client.headers.update({"X-CSRF-Token": csrf, "Origin": "http://localhost:5173"})
        response = await client.post("/api/auth/login", json={"email": email, "password": "Test-password!"})
        assert response.status_code == 200, response.text
        result[role.value] = client
    result["ANONYMOUS"] = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    yield result
    for client in result.values():
        await client.aclose()
