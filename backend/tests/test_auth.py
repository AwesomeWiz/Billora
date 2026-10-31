
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_auth_flow():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        # Add the existing authentication test requests here.
        response = await client.get("/api/auth/csrf")
        assert response.status_code == 200
