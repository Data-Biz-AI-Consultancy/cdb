import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.schemas.activity import ActivityResponse
from cdb.schemas.common import PaginatedResponse
from cdb.schemas.engagement import (
    EngagementActivitiesLinkRequest,
    EngagementActivityCreate,
    EngagementAISummaryResponse,
    EngagementCreate,
    EngagementPersonAttach,
    EngagementResponse,
    EngagementUpdate,
)
from cdb.services import engagements as engagement_service

router = APIRouter(prefix="/engagements", tags=["Engagements"])


@router.get("", response_model=PaginatedResponse[EngagementResponse])
async def list_engagements(
    status: str | None = Query(None),
    company_id: uuid.UUID | None = Query(None),
    person_id: uuid.UUID | None = Query(None),
    engagement_type: str | None = Query(None),
    search: str | None = Query(None),
    limit: int | None = Query(None, ge=1, le=200),
    page_size: int | None = Query(None, ge=1, le=200),
    cursor: str | None = Query(None),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_limit = limit or page_size or 50
    items, pagination = await engagement_service.list_engagements(
        db,
        status=status,
        company_id=company_id,
        person_id=person_id,
        engagement_type=engagement_type,
        search=search,
        limit=effective_limit,
        cursor=cursor,
        sort=sort,
        order=order,
    )
    return PaginatedResponse(data=items, pagination=pagination)


@router.post("", response_model=EngagementResponse, status_code=status.HTTP_201_CREATED)
async def create_engagement(
    payload: EngagementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await engagement_service.create_engagement(db, payload, owner_id=current_user.id)


@router.get("/{engagement_id}", response_model=EngagementResponse)
async def get_engagement(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await engagement_service.get_engagement(db, engagement_id)


@router.patch("/{engagement_id}", response_model=EngagementResponse)
async def update_engagement(
    engagement_id: uuid.UUID,
    payload: EngagementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await engagement_service.update_engagement(db, engagement_id, payload)


@router.delete("/{engagement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_engagement(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await engagement_service.delete_engagement(db, engagement_id)


@router.post("/{engagement_id}/persons", response_model=EngagementResponse)
async def attach_person_to_engagement(
    engagement_id: uuid.UUID,
    payload: EngagementPersonAttach,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await engagement_service.attach_person_to_engagement(db, engagement_id, payload)


@router.delete("/{engagement_id}/persons/{person_id}", response_model=EngagementResponse)
async def detach_person_from_engagement(
    engagement_id: uuid.UUID,
    person_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await engagement_service.detach_person_from_engagement(db, engagement_id, person_id)


@router.get("/{engagement_id}/activities", response_model=list[ActivityResponse])
async def list_engagement_activities(
    engagement_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await engagement_service.list_engagement_activities(
        db, engagement_id=engagement_id, limit=limit
    )


@router.post(
    "/{engagement_id}/activities",
    response_model=ActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_engagement_activity(
    engagement_id: uuid.UUID,
    payload: EngagementActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await engagement_service.create_engagement_activity(
        db, engagement_id=engagement_id, data=payload
    )


@router.get("/{engagement_id}/ai-summary", response_model=EngagementAISummaryResponse)
async def get_engagement_ai_summary(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    eng = await engagement_service.get_engagement(db, engagement_id)
    if eng.ai_summary:
        return eng.ai_summary
    return await engagement_service.generate_engagement_ai_summary(db, engagement_id)


@router.post("/{engagement_id}/ai-summary/refresh", response_model=EngagementAISummaryResponse)
async def refresh_engagement_ai_summary(
    engagement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await engagement_service.generate_engagement_ai_summary(db, engagement_id)


@router.post("/{engagement_id}/activities/link", response_model=list[ActivityResponse])
async def link_activities_to_engagement(
    engagement_id: uuid.UUID,
    payload: EngagementActivitiesLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await engagement_service.link_activities_to_engagement(
        db, engagement_id=engagement_id, activity_ids=payload.activity_ids
    )


@router.delete(
    "/{engagement_id}/activities/{activity_id}/link",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def unlink_activity_from_engagement(
    engagement_id: uuid.UUID,
    activity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await engagement_service.unlink_activity_from_engagement(
        db, engagement_id=engagement_id, activity_id=activity_id
    )
