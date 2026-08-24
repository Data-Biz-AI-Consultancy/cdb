import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user, require_admin
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.schemas.common import PaginatedResponse
from cdb.schemas.person import (
    PersonCreate,
    PersonDetailResponse,
    PersonSummaryResponse,
    PersonUpdate,
)
from cdb.services import persons as person_service

router = APIRouter(prefix="/persons", tags=["Persons"])


@router.get("", response_model=PaginatedResponse[PersonSummaryResponse])
async def list_persons(
    q: str | None = Query(None, description="Search across names or email"),
    source: str | None = Query(None, description="Filter by source"),
    country: str | None = Query(None, description="Filter by country (ISO-2)"),
    has_open_opportunity: bool | None = Query(None),
    has_open_lead: bool | None = Query(None),
    include_deleted: bool = Query(False),
    limit: int | None = Query(None, ge=1, le=200),
    page_size: int | None = Query(None, ge=1, le=200),
    cursor: str | None = Query(None),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_limit = limit or page_size or 50
    items, pagination = await person_service.list_persons(
        db,
        q=q,
        source=source,
        country=country,
        has_open_opportunity=has_open_opportunity,
        has_open_lead=has_open_lead,
        include_deleted=include_deleted,
        limit=effective_limit,
        cursor=cursor,
        sort=sort,
        order=order,
    )
    return PaginatedResponse(data=items, pagination=pagination)


@router.post("", response_model=PersonDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_person(
    payload: PersonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    person = await person_service.create_person(db, payload)
    return await person_service.get_person_detail(db, person.id)


@router.get("/{person_id}", response_model=PersonDetailResponse)
async def get_person(
    person_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await person_service.get_person_detail(db, person_id)


@router.patch("/{person_id}", response_model=PersonDetailResponse)
async def update_person(
    person_id: uuid.UUID,
    payload: PersonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await person_service.update_person(db, person_id, payload)


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    person_id: uuid.UUID,
    hard: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if hard and current_user.role != "admin":
        await require_admin(current_user)
    await person_service.delete_person(db, person_id, hard=hard)
