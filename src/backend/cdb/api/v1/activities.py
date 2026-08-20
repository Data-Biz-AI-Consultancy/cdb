import datetime
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.schemas.activity import ActivityCreate, ActivityResponse, ActivityUpdate
from cdb.schemas.common import PaginatedResponse
from cdb.services import activities as activity_service

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.get("", response_model=PaginatedResponse[ActivityResponse])
async def list_activities(
    person_id: uuid.UUID | None = Query(None),
    company_id: uuid.UUID | None = Query(None),
    type: str | None = Query(None),
    source: str | None = Query(None),
    from_date: datetime.datetime | None = Query(None, alias="from"),
    to_date: datetime.datetime | None = Query(None, alias="to"),
    limit: int = Query(50, ge=1, le=200),
    cursor: str | None = Query(None),
    sort: str = Query("occurred_at"),
    order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, pagination = await activity_service.list_activities(
        db,
        person_id=person_id,
        company_id=company_id,
        type=type,
        source=source,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
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
