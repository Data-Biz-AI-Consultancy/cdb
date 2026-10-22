import secrets
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Depends, Header, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.config import settings
from cdb.core.database import get_db
from cdb.core.errors import ForbiddenError, UnauthorizedError
from cdb.core.security import decode_token
from cdb.models.user import User

security_scheme = HTTPBearer(auto_error=False)

ApiKeyAuthenticator = Callable[[str | None], Awaitable[bool]]

_api_key_authenticators: list[ApiKeyAuthenticator] = []


def register_api_key_authenticator(authenticator: ApiKeyAuthenticator) -> None:
    """Register an embedding-process check consulted after the deployment key misses."""
    if authenticator not in _api_key_authenticators:
        _api_key_authenticators.append(authenticator)


def unregister_api_key_authenticator(authenticator: ApiKeyAuthenticator) -> None:
    _api_key_authenticators[:] = [
        item for item in _api_key_authenticators if item is not authenticator
    ]


def _deployment_key_matches(provided: str | None) -> bool:
    expected = settings.CDB_API_KEY if isinstance(settings.CDB_API_KEY, str) else ""
    if not expected or not provided:
        return False
    return secrets.compare_digest(provided.encode(), expected.encode())


async def _api_key_accepted(x_api_key: str | None) -> bool:
    if _deployment_key_matches(x_api_key):
        return True
    for authenticator in tuple(_api_key_authenticators):
        if await authenticator(x_api_key):
            return True
    return False


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
    token_query: str | None = Query(None, alias="token"),
) -> User:
    token: str | None = None
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    elif token_query:
        token = token_query

    if not token:
        raise UnauthorizedError("Missing or invalid authorization header")
    try:
        payload = decode_token(token)
    except Exception as exc:
        raise UnauthorizedError("Invalid or expired access token") from exc

    if payload.get("type") != "access":
        raise UnauthorizedError("Invalid token type")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedError("Invalid token payload")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError as exc:
        raise UnauthorizedError("Invalid user ID in token") from exc

    stmt = select(User).where(User.id == user_id, User.is_active.is_(True))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedError("User not found or inactive")

    return user


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "admin":
        raise ForbiddenError("Admin privileges required")
    return current_user


async def require_api_key(
    x_api_key: str | None = Header(None, alias="X-API-Key"),
) -> str:
    if not await _api_key_accepted(x_api_key):
        raise UnauthorizedError("Invalid or missing service API key")
    return x_api_key or ""


async def get_current_user_or_api_key(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if await _api_key_accepted(x_api_key):
        return None
    if credentials and credentials.scheme.lower() == "bearer":
        return await get_current_user(credentials=credentials, db=db)
    raise UnauthorizedError("Missing or invalid authorization credentials")
