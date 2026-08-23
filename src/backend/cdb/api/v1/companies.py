import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user, require_admin
from cdb.core.database import get_db
from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.user import User
from cdb.schemas.common import PaginatedResponse
from cdb.schemas.company import (
    CompanyCreate,
    CompanyDetailResponse,
    CompanySummaryResponse,
    CompanyUpdate,
    RelationshipCreate,
    RelationshipResponse,
    RelationshipUpdate,
)
from cdb.services import companies as company_service

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.get("", response_model=PaginatedResponse[CompanySummaryResponse])
async def list_companies(
    q: str | None = Query(None),
    country: str | None = Query(None),
    industry: str | None = Query(None),
    include_deleted: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    cursor: str | None = Query(None),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, pagination = await company_service.list_companies(
        db,
        q=q,
        country=country,
        industry=industry,
        include_deleted=include_deleted,
        limit=limit,
        cursor=cursor,
        sort=sort,
        order=order,
    )
    return PaginatedResponse(data=items, pagination=pagination)


@router.post("", response_model=CompanyDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    payload: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comp = await company_service.create_company(db, payload)
    return await company_service.get_company_detail(db, comp.id)


@router.get("/{company_id}", response_model=CompanyDetailResponse)
async def get_company(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await company_service.get_company_detail(db, company_id)


@router.get("/{company_id}/persons")
async def get_company_persons(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(PersonCompanyRelationship)
        .where(PersonCompanyRelationship.company_id == company_id)
        .order_by(PersonCompanyRelationship.created_at.desc())
    )
    rels = (await db.execute(stmt)).scalars().all()
    return {"data": [RelationshipResponse.model_validate(r) for r in rels]}


@router.patch("/{company_id}", response_model=CompanyDetailResponse)
async def update_company(
    company_id: uuid.UUID,
    payload: CompanyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await company_service.update_company(db, company_id, payload)


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: uuid.UUID,
    hard: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if hard and current_user.role != "admin":
        await require_admin(current_user)
    await company_service.delete_company(db, company_id, hard=hard)


# Relationship subroutes
@router.post("/persons/{person_id}/companies", response_model=RelationshipResponse, status_code=status.HTTP_201_CREATED)
async def add_person_relationship(
    person_id: uuid.UUID,
    payload: RelationshipCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await company_service.add_person_to_company(db, person_id, payload)


@router.patch("/persons/{person_id}/companies/{company_id}", response_model=RelationshipResponse)
async def update_person_relationship(
    person_id: uuid.UUID,
    company_id: uuid.UUID,
    payload: RelationshipUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await company_service.update_person_company_relationship(db, person_id, company_id, payload)


@router.delete("/persons/{person_id}/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person_relationship(
    person_id: uuid.UUID,
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await company_service.remove_person_from_company(db, person_id, company_id)
