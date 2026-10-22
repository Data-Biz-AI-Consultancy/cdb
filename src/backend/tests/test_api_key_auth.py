import pytest
from httpx import AsyncClient

from cdb.api import deps
from cdb.core.errors import UnauthorizedError


@pytest.fixture(autouse=True)
def _deployment_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(deps.settings, "CDB_API_KEY", "operator-deployment-key")
    yield
    deps._api_key_authenticators.clear()


@pytest.mark.asyncio
async def test_builtin_keys_fail_when_deployment_key_differs():
    for presented in ("development-api-key", "production-api-key", "other-key"):
        with pytest.raises(UnauthorizedError):
            await deps.require_api_key(x_api_key=presented)
        with pytest.raises(UnauthorizedError):
            await deps.get_current_user_or_api_key(credentials=None, x_api_key=presented, db=None)

    assert await deps.require_api_key(x_api_key="operator-deployment-key") == (
        "operator-deployment-key"
    )
    assert (
        await deps.get_current_user_or_api_key(
            credentials=None, x_api_key="operator-deployment-key", db=None
        )
        is None
    )


@pytest.mark.asyncio
async def test_empty_deployment_key_rejects_every_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(deps.settings, "CDB_API_KEY", "")
    for presented in (
        "development-api-key",
        "production-api-key",
        "operator-deployment-key",
        "",
        None,
    ):
        with pytest.raises(UnauthorizedError):
            await deps.require_api_key(x_api_key=presented)


@pytest.mark.asyncio
async def test_authenticator_runs_only_after_deployment_key_misses():
    calls: list[str | None] = []

    async def allow(x_api_key: str | None) -> bool:
        calls.append(x_api_key)
        return True

    deps.register_api_key_authenticator(allow)
    try:
        assert await deps.require_api_key(x_api_key="operator-deployment-key") == (
            "operator-deployment-key"
        )
        assert calls == []

        assert await deps.require_api_key(x_api_key=None) == ""
        assert (
            await deps.get_current_user_or_api_key(credentials=None, x_api_key="nope", db=None)
            is None
        )
        assert calls == [None, "nope"]
    finally:
        deps.unregister_api_key_authenticator(allow)


@pytest.mark.asyncio
async def test_authenticator_miss_rejects_request():
    async def deny(x_api_key: str | None) -> bool:
        return False

    deps.register_api_key_authenticator(deny)
    try:
        with pytest.raises(UnauthorizedError):
            await deps.require_api_key(x_api_key="not-the-deployment-key")
        with pytest.raises(UnauthorizedError):
            await deps.get_current_user_or_api_key(credentials=None, x_api_key=None, db=None)
    finally:
        deps.unregister_api_key_authenticator(deny)


@pytest.mark.asyncio
async def test_status_route_accepts_deployment_key_only(client: AsyncClient):
    ok = await client.get(
        "/api/v1/connectors/linkedin/status",
        headers={"X-API-Key": "operator-deployment-key"},
    )
    assert ok.status_code == 200

    rejected = await client.get(
        "/api/v1/connectors/linkedin/status",
        headers={"X-API-Key": "development-api-key"},
    )
    assert rejected.status_code == 401

    missing = await client.get("/api/v1/connectors/linkedin/status")
    assert missing.status_code == 401
