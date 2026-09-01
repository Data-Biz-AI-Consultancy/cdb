import datetime
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user, get_current_user_or_api_key
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.schemas.activity import (
    ActivityCreate,
    ActivityResponse,
    ActivityStatsResponse,
    ActivityUpdate,
)
from cdb.schemas.common import PaginatedResponse
from cdb.services import activities as activity_service

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.get("/stats", response_model=ActivityStatsResponse)
async def get_activity_stats(
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
):
    return await activity_service.get_activity_stats(db)


@router.get("", response_model=PaginatedResponse[ActivityResponse])
async def list_activities(
    q: str | None = Query(None, description="Search across title, summary, or contact/company"),
    person_id: uuid.UUID | None = Query(None),
    company_id: uuid.UUID | None = Query(None),
    type: str | None = Query(None),
    source: str | None = Query(None),
    from_date: datetime.datetime | None = Query(None, alias="from"),
    to_date: datetime.datetime | None = Query(None, alias="to"),
    page: int | None = Query(None, ge=1, description="Page number (1-indexed)"),
    limit: int | None = Query(None, ge=1, le=200),
    page_size: int | None = Query(None, ge=1, le=200),
    cursor: str | None = Query(None),
    sort: str = Query("occurred_at"),
    order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
):
    effective_limit = limit or page_size or 50
    items, pagination = await activity_service.list_activities(
        db,
        q=q,
        person_id=person_id,
        company_id=company_id,
        type=type,
        source=source,
        from_date=from_date,
        to_date=to_date,
        page=page,
        limit=effective_limit,
        cursor=cursor,
        sort=sort,
        order=order,
    )
    return PaginatedResponse(data=items, pagination=pagination)


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    payload: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await activity_service.create_activity(db, payload)


@router.get("/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await activity_service.get_activity(db, activity_id)


@router.patch("/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: uuid.UUID,
    payload: ActivityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await activity_service.update_activity(db, activity_id, payload)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await activity_service.delete_activity(db, activity_id)
