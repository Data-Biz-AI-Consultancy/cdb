import uuid
from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.config import settings
from cdb.core.database import get_db
from cdb.core.errors import ForbiddenError, UnauthorizedError
from cdb.core.security import decode_token
from cdb.models.user import User

security_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise UnauthorizedError("Missing or invalid authorization header")

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except Exception:
        raise UnauthorizedError("Invalid or expired access token")

    if payload.get("type") != "access":
        raise UnauthorizedError("Invalid token type")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedError("Invalid token payload")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise UnauthorizedError("Invalid user ID in token")

    stmt = select(User).where(User.id == user_id, User.is_active == True)
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
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> str:
    if not x_api_key or x_api_key != settings.CDB_API_KEY:
        raise UnauthorizedError("Invalid or missing service API key")
    return x_api_key
