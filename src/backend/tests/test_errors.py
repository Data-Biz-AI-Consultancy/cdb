import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_validation_error_envelope(client: AsyncClient):
    # Missing required password field
    response = await client.post("/api/v1/auth/register", json={"email": "not-an-email"})
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in data["error"]


@pytest.mark.asyncio
async def test_not_found_envelope(client: AsyncClient):
    response = await client.get("/api/v1/non-existent-route")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
