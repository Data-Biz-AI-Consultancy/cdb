import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.schemas.common import PaginatedResponse
from cdb.schemas.opportunity import (
    OpportunityClose,
    OpportunityCompanyAttach,
    OpportunityCreate,
    OpportunityPersonAttach,
    OpportunityResponse,
    OpportunityUpdate,
)
from cdb.schemas.opportunity_history import (
    OpportunityActionResponse,
    OpportunityHistoryResponse,
    OpportunityNoteCreate,
)
from cdb.services import opportunities as opportunity_service
from cdb.services import opportunity_history as history_service

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])


@router.get("/actions", response_model=list[OpportunityActionResponse])
async def list_opportunity_actions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await history_service.list_opportunity_actions(db)


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
    return await opportunity_service.create_opportunity(db, payload, changed_by_id=current_user.id)


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
    return await opportunity_service.update_opportunity(
        db, opportunity_id, payload, changed_by_id=current_user.id
    )


@router.post("/{opportunity_id}/advance", response_model=OpportunityResponse)
async def advance_opportunity(
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.advance_opportunity(
        db, opportunity_id, changed_by_id=current_user.id
    )


@router.post("/{opportunity_id}/close", response_model=OpportunityResponse)
async def close_opportunity(
    opportunity_id: uuid.UUID,
    payload: OpportunityClose,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.close_opportunity(
        db, opportunity_id, payload, changed_by_id=current_user.id
    )


@router.delete("/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity(
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await opportunity_service.delete_opportunity(db, opportunity_id)


# Attached Person endpoints
@router.post("/{opportunity_id}/persons", response_model=OpportunityResponse)
async def attach_person_to_opportunity(
    opportunity_id: uuid.UUID,
    payload: OpportunityPersonAttach,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.attach_person_to_opportunity(
        db, opportunity_id, payload, changed_by_id=current_user.id
    )


@router.delete("/{opportunity_id}/persons/{person_id}", response_model=OpportunityResponse)
async def detach_person_from_opportunity(
    opportunity_id: uuid.UUID,
    person_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.detach_person_from_opportunity(
        db, opportunity_id, person_id, changed_by_id=current_user.id
    )


# Attached Company endpoints
@router.post("/{opportunity_id}/companies", response_model=OpportunityResponse)
async def attach_company_to_opportunity(
    opportunity_id: uuid.UUID,
    payload: OpportunityCompanyAttach,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.attach_company_to_opportunity(
        db, opportunity_id, payload, changed_by_id=current_user.id
    )


@router.delete("/{opportunity_id}/companies/{company_id}", response_model=OpportunityResponse)
async def detach_company_from_opportunity(
    opportunity_id: uuid.UUID,
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await opportunity_service.detach_company_from_opportunity(
        db, opportunity_id, company_id, changed_by_id=current_user.id
    )


# History & Activity Log endpoints
@router.get(
    "/{opportunity_id}/history",
    response_model=PaginatedResponse[OpportunityHistoryResponse],
)
async def get_opportunity_history(
    opportunity_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    cursor: str | None = Query(None),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, pagination = await history_service.list_opportunity_history(
        db,
        opportunity_id=opportunity_id,
        limit=limit,
        cursor=cursor,
        sort=sort,
        order=order,
    )
    return PaginatedResponse(data=items, pagination=pagination)


@router.post(
    "/{opportunity_id}/history/notes",
    response_model=OpportunityHistoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_opportunity_history_note(
    opportunity_id: uuid.UUID,
    payload: OpportunityNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify opportunity exists
    await opportunity_service.get_opportunity(db, opportunity_id)

    item = await history_service.record_opportunity_history(
        db=db,
        opportunity_id=opportunity_id,
        action_id="note_added",
        changed_by_id=current_user.id,
        changes={"note": payload.note},
        summary=payload.note,
        commit=True,
    )

    # Fetch loaded action
    items, _ = await history_service.list_opportunity_history(
        db, opportunity_id=opportunity_id, limit=1
    )
    for it in items:
        if it.id == item.id:
            return it

    action_resp = None
    if item.action:
        action_resp = OpportunityActionResponse.model_validate(item.action)

    return OpportunityHistoryResponse(
        id=item.id,
        opportunity_id=item.opportunity_id,
        action_id=item.action_id,
        action=action_resp,
        changed_by_id=item.changed_by_id,
        field_name=item.field_name,
        old_value=item.old_value,
        new_value=item.new_value,
        changes=item.changes or {},
        summary=item.summary,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )
