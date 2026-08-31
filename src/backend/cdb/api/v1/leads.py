import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user, get_current_user_or_api_key
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.schemas.common import PaginatedResponse
from cdb.schemas.lead import (
    LeadAdvance,
    LeadConvert,
    LeadCreate,
    LeadDisqualify,
    LeadResponse,
    LeadUpdate,
)
from cdb.schemas.opportunity import OpportunityResponse
from cdb.services import leads as lead_service

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("", response_model=PaginatedResponse[LeadResponse])
async def list_leads(
    q: str | None = Query(
        None, description="Search across notes, intent, person name/email, company"
    ),
    stage: str | None = Query(None),
    source: str | None = Query(None),
    signal_strength: str | None = Query(None),
    owner_id: uuid.UUID | None = Query(None),
    person_id: uuid.UUID | None = Query(None),
    company_id: uuid.UUID | None = Query(None),
    page: int | None = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: int | None = Query(None, ge=1, le=200),
    limit: int | None = Query(None, ge=1, le=200),
    cursor: str | None = Query(None),
    sort: str = Query(
        "created_at", description="Sort field: created_at, updated_at, stage, signal_strength"
    ),
    order: str = Query("desc", description="Sort order: desc (most recent first) or asc"),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
):
    effective_limit = limit or page_size or 50
    items, pagination = await lead_service.list_leads(
        db,
        q=q,
        stage=stage,
        source=source,
        signal_strength=signal_strength,
        owner_id=owner_id,
        person_id=person_id,
        company_id=company_id,
        limit=effective_limit,
        page=page,
        cursor=cursor,
        sort=sort,
        order=order,
    )
    return PaginatedResponse(data=items, pagination=pagination)


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.owner_id:
        payload.owner_id = current_user.id
    return await lead_service.create_lead(db, payload)


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await lead_service.get_lead(db, lead_id)


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: uuid.UUID,
    payload: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await lead_service.update_lead(db, lead_id, payload)


@router.post("/{lead_id}/advance", response_model=LeadResponse)
async def advance_lead(
    lead_id: uuid.UUID,
    payload: LeadAdvance,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await lead_service.advance_lead(db, lead_id, payload)


@router.post("/{lead_id}/disqualify", response_model=LeadResponse)
async def disqualify_lead(
    lead_id: uuid.UUID,
    payload: LeadDisqualify,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await lead_service.disqualify_lead(db, lead_id, payload)


@router.post(
    "/{lead_id}/convert", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED
)
async def convert_lead(
    lead_id: uuid.UUID,
    payload: LeadConvert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await lead_service.convert_lead_to_opportunity(db, lead_id, payload)
