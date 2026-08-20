import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_healthcheck(client: AsyncClient):
    response = await client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"

    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
