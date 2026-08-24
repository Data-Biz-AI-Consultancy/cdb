import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.schemas.common import PaginatedResponse
from cdb.schemas.opportunity import (
    OpportunityClose,
    OpportunityCreate,
    OpportunityResponse,
    OpportunityUpdate,
)
from cdb.services import opportunities as opportunity_service

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])


@router.get("", response_model=PaginatedResponse[OpportunityResponse])
async def list_opportunities(
    stage: str | None = Query(None),
    owner_id: uuid.UUID | None = Query(None),
    person_id: uuid.UUID | None = Query(None),
    company_id: uuid.UUID | None = Query(None),
    limit: int | None = Query(None, ge=1, le=200),
    page_size: int | None = Query(None, ge=1, le=200),
    cursor: str | None = Query(None),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_limit = limit or page_size or 50
    items, pagination = await opportunity_service.list_opportunities(
        db,
        stage=stage,
        owner_id=owner_id,
        person_id=person_id,
        company_id=company_id,
        limit=effective_limit,
        cursor=cursor,
        sort=sort,
        order=order,
    )
    return PaginatedResponse(data=items, pagination=pagination)


@router.post("", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    payload: OpportunityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.owner_id:
        payload.owner_id = current_user.id
    return await opportunity_service.create_opportunity(db, payload)


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.get_opportunity(db, opportunity_id)


@router.patch("/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: uuid.UUID,
    payload: OpportunityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.update_opportunity(db, opportunity_id, payload)


@router.post("/{opportunity_id}/advance", response_model=OpportunityResponse)
async def advance_opportunity(
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.advance_opportunity(db, opportunity_id)


@router.post("/{opportunity_id}/close", response_model=OpportunityResponse)
async def close_opportunity(
    opportunity_id: uuid.UUID,
    payload: OpportunityClose,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.close_opportunity(db, opportunity_id, payload)


@router.delete("/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity(
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await opportunity_service.delete_opportunity(db, opportunity_id)
