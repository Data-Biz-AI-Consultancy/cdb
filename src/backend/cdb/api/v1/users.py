import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user_or_api_key, get_db
from cdb.core.errors import ConflictError, NotFoundError
from cdb.core.security import get_password_hash
from cdb.models.user import User
from cdb.schemas.user import (
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=UserListResponse)
async def list_users(
    q: str | None = Query(None, description="Search by email or full name"),
    role: str | None = Query(None, description="Filter by role"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> UserListResponse:
    query = select(User)

    if is_active is not None:
        query = query.where(User.is_active == is_active)

    if role:
        query = query.where(User.role == role)

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.where(
            or_(
                User.email.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginate and order by full_name / email
    offset = (page - 1) * page_size
    query = (
        query.order_by(User.full_name.asc().nulls_last(), User.email.asc())
        .offset(offset)
        .limit(page_size)
    )

    result = await db.execute(query)
    users = result.scalars().all()

    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> UserResponse:
    # Check if email exists
    stmt = select(User).where(User.email == payload.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise ConflictError(f"User with email '{payload.email}' already exists")

    user = User(
        email=payload.email,
        hashed_pw=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> UserResponse:
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise NotFoundError(f"User '{user_id}' not found")
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> UserResponse:
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise NotFoundError(f"User '{user_id}' not found")

    if payload.email is not None and payload.email != user.email:
        # Check uniqueness
        check_stmt = select(User).where(User.email == payload.email, User.id != user_id)
        check_res = await db.execute(check_stmt)
        if check_res.scalar_one_or_none():
            raise ConflictError(f"User with email '{payload.email}' already exists")
        user.email = payload.email

    if payload.full_name is not None:
        user.full_name = payload.full_name

    if payload.role is not None:
        user.role = payload.role

    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.password is not None and payload.password.strip():
        user.hashed_pw = get_password_hash(payload.password)

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> dict:
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise NotFoundError(f"User '{user_id}' not found")

    # Soft-delete / deactivate user
    user.is_active = False
    await db.commit()
    return {"message": f"User '{user_id}' deactivated successfully", "id": str(user_id)}
