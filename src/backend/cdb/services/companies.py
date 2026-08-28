import datetime
import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import ConflictError, NotFoundError
from cdb.models.company import Company
from cdb.models.lead import Lead
from cdb.models.opportunity import Opportunity, OpportunityCompany
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.company import (
    CompanyCreate,
    CompanyDetailResponse,
    CompanyEmployeeResponse,
    CompanySummaryResponse,
    CompanyUpdate,
    RelationshipCreate,
    RelationshipResponse,
    RelationshipUpdate,
)


async def list_companies(
    db: AsyncSession,
    q: str | None = None,
    country: str | None = None,
    industry: str | None = None,
    include_deleted: bool = False,
    limit: int = 50,
    cursor: str | None = None,
    sort: str = "created_at",
    order: str = "desc",
) -> tuple[list[CompanySummaryResponse], PaginationMetadata]:
    stmt = select(Company)

    if not include_deleted:
        stmt = stmt.where(Company.deleted_at.is_(None))

    if q:
        search_pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Company.name.ilike(search_pattern),
                Company.domain.ilike(search_pattern),
            )
        )

    if country:
        stmt = stmt.where(Company.country == country.upper())

    if industry:
        stmt = stmt.where(Company.industry.ilike(f"%{industry}%"))

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    if order.lower() == "asc":
        stmt = stmt.order_by(getattr(Company, sort, Company.created_at).asc())
    else:
        stmt = stmt.order_by(getattr(Company, sort, Company.created_at).desc())

    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    companies = (await db.execute(stmt)).scalars().all()

    items: list[CompanySummaryResponse] = []
    for c in companies:
        contacts_count = (
            await db.execute(
                select(func.count(PersonCompanyRelationship.id)).where(
                    PersonCompanyRelationship.company_id == c.id
                )
            )
        ).scalar() or 0

        leads_count = (
            await db.execute(select(func.count(Lead.id)).where(Lead.company_id == c.id))
        ).scalar() or 0

        opps_count = (
            await db.execute(
                select(func.count(Opportunity.id))
                .join(OpportunityCompany, OpportunityCompany.opportunity_id == Opportunity.id)
                .where(
                    OpportunityCompany.company_id == c.id,
                    Opportunity.stage.in_(["prospect", "qualified", "proposal", "negotiation"]),
                )
            )
        ).scalar() or 0

        opps_val = (
            await db.execute(
                select(func.coalesce(func.sum(Opportunity.value), 0))
                .join(OpportunityCompany, OpportunityCompany.opportunity_id == Opportunity.id)
                .where(
                    OpportunityCompany.company_id == c.id,
                    Opportunity.stage.in_(
                        ["prospect", "qualified", "proposal", "negotiation", "closed_won"]
                    ),
                )
            )
        ).scalar() or 0.0

        items.append(
            CompanySummaryResponse(
                id=c.id,
                name=c.name,
                domain=c.domain,
                industry=c.industry,
                size_range=c.size_range,
                country=c.country,
                city=c.city,
                contacts_count=contacts_count,
                leads_count=leads_count,
                open_opportunities_count=opps_count,
                total_opportunities_value=float(opps_val),
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )

    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    # Global aggregate metrics across entire CRM
    global_contacts_count = (
        await db.execute(select(func.count(PersonCompanyRelationship.id)))
    ).scalar() or 0
    global_leads_count = (await db.execute(select(func.count(Lead.id)))).scalar() or 0
    global_pipeline_value = (
        await db.execute(
            select(func.coalesce(func.sum(Opportunity.value), 0.0)).where(
                Opportunity.stage.in_(
                    ["prospect", "qualified", "proposal", "negotiation", "closed_won"]
                )
            )
        )
    ).scalar() or 0.0

    return items, PaginationMetadata(
        next_cursor=next_cursor,
        has_more=has_more,
        total=total,
        total_contacts_count=global_contacts_count,
        total_leads_count=global_leads_count,
        total_pipeline_value=float(global_pipeline_value),
    )


async def create_company(db: AsyncSession, data: CompanyCreate) -> Company:
    domain_norm = data.domain.strip().lower() if data.domain else None
    if domain_norm:
        existing = (
            await db.execute(select(Company).where(Company.domain == domain_norm))
        ).scalar_one_or_none()
        if existing:
            raise ConflictError(f"Company with domain '{domain_norm}' already exists.")

    company = Company(
        name=data.name,
        domain=domain_norm,
        industry=data.industry,
        size_range=data.size_range,
        country=data.country.upper() if data.country else None,
        city=data.city,
        linkedin_url=data.linkedin_url,
        avatar_url=data.avatar_url,
        attributes=data.attributes,
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


async def get_company_detail(db: AsyncSession, company_id: uuid.UUID) -> CompanyDetailResponse:
    company = (
        await db.execute(select(Company).where(Company.id == company_id))
    ).scalar_one_or_none()
    if not company:
        raise NotFoundError(f"Company with id {company_id} not found.")

    contacts_count = (
        await db.execute(
            select(func.count(PersonCompanyRelationship.id)).where(
                PersonCompanyRelationship.company_id == company.id
            )
        )
    ).scalar() or 0

    leads_count = (
        await db.execute(select(func.count(Lead.id)).where(Lead.company_id == company.id))
    ).scalar() or 0

    opps_count = (
        await db.execute(
            select(func.count(Opportunity.id))
            .join(OpportunityCompany, OpportunityCompany.opportunity_id == Opportunity.id)
            .where(
                OpportunityCompany.company_id == company.id,
                Opportunity.stage.in_(["prospect", "qualified", "proposal", "negotiation"]),
            )
        )
    ).scalar() or 0

    opps_val = (
        await db.execute(
            select(func.coalesce(func.sum(Opportunity.value), 0))
            .join(OpportunityCompany, OpportunityCompany.opportunity_id == Opportunity.id)
            .where(
                OpportunityCompany.company_id == company.id,
                Opportunity.stage.in_(
                    ["prospect", "qualified", "proposal", "negotiation", "closed_won"]
                ),
            )
        )
    ).scalar() or 0.0

    return CompanyDetailResponse(
        id=company.id,
        name=company.name,
        domain=company.domain,
        industry=company.industry,
        size_range=company.size_range,
        country=company.country,
        city=company.city,
        linkedin_url=company.linkedin_url,
        avatar_url=company.avatar_url,
        attributes=company.attributes or {},
        contacts_count=contacts_count,
        leads_count=leads_count,
        open_opportunities_count=opps_count,
        total_opportunities_value=float(opps_val),
        created_at=company.created_at,
        updated_at=company.updated_at,
        deleted_at=company.deleted_at,
    )


async def update_company(
    db: AsyncSession, company_id: uuid.UUID, data: CompanyUpdate
) -> CompanyDetailResponse:
    company = (
        await db.execute(select(Company).where(Company.id == company_id))
    ).scalar_one_or_none()
    if not company:
        raise NotFoundError(f"Company with id {company_id} not found.")

    update_dict = data.model_dump(exclude_unset=True)
    if "domain" in update_dict and update_dict["domain"]:
        update_dict["domain"] = update_dict["domain"].strip().lower()
    if "country" in update_dict and update_dict["country"]:
        update_dict["country"] = update_dict["country"].upper()

    for k, v in update_dict.items():
        setattr(company, k, v)

    await db.commit()
    await db.refresh(company)
    return await get_company_detail(db, company.id)


async def delete_company(db: AsyncSession, company_id: uuid.UUID, hard: bool = False) -> None:
    company = (
        await db.execute(select(Company).where(Company.id == company_id))
    ).scalar_one_or_none()
    if not company:
        raise NotFoundError(f"Company with id {company_id} not found.")

    if hard:
        await db.delete(company)
    else:
        company.deleted_at = datetime.datetime.now(datetime.UTC)

    await db.commit()


# Person-Company Relationships
async def add_person_to_company(
    db: AsyncSession, person_id: uuid.UUID, data: RelationshipCreate
) -> RelationshipResponse:
    # Verify person and company exist
    p = (await db.execute(select(Person).where(Person.id == person_id))).scalar_one_or_none()
    if not p:
        raise NotFoundError(f"Person {person_id} not found.")
    c = (
        await db.execute(select(Company).where(Company.id == data.company_id))
    ).scalar_one_or_none()
    if not c:
        raise NotFoundError(f"Company {data.company_id} not found.")

    # Check for existing relationship with same title
    existing = (
        await db.execute(
            select(PersonCompanyRelationship).where(
                PersonCompanyRelationship.person_id == person_id,
                PersonCompanyRelationship.company_id == data.company_id,
                PersonCompanyRelationship.title == data.title,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.is_current = data.is_current
        existing.started_at = data.started_at
        existing.ended_at = data.ended_at
        await db.commit()
        await db.refresh(existing)
        return RelationshipResponse.model_validate(existing)

    rel = PersonCompanyRelationship(
        person_id=person_id,
        company_id=data.company_id,
        title=data.title,
        is_current=data.is_current,
        started_at=data.started_at,
        ended_at=data.ended_at,
    )
    db.add(rel)

    from cdb.services.person_history import record_person_history

    await record_person_history(
        db,
        person_id=person_id,
        action_id="company_linked",
        changes={
            "company_id": str(data.company_id),
            "company_name": c.name,
            "title": data.title,
            "is_current": data.is_current,
        },
        summary=f"Linked to company '{c.name}' as '{data.title or 'Role'}'",
    )

    await db.commit()
    await db.refresh(rel)
    return RelationshipResponse.model_validate(rel)


async def update_person_company_relationship(
    db: AsyncSession, person_id: uuid.UUID, company_id: uuid.UUID, data: RelationshipUpdate
) -> RelationshipResponse:
    rel = (
        (
            await db.execute(
                select(PersonCompanyRelationship).where(
                    PersonCompanyRelationship.person_id == person_id,
                    PersonCompanyRelationship.company_id == company_id,
                )
            )
        )
        .scalars()
        .first()
    )

    if not rel:
        raise NotFoundError("Relationship not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(rel, k, v)

    await db.commit()
    await db.refresh(rel)
    return RelationshipResponse.model_validate(rel)


async def remove_person_from_company(
    db: AsyncSession, person_id: uuid.UUID, company_id: uuid.UUID
) -> None:
    rels = (
        (
            await db.execute(
                select(PersonCompanyRelationship).where(
                    PersonCompanyRelationship.person_id == person_id,
                    PersonCompanyRelationship.company_id == company_id,
                )
            )
        )
        .scalars()
        .all()
    )

    if not rels:
        raise NotFoundError("Relationship not found.")

    for r in rels:
        await db.delete(r)
    await db.commit()


async def list_company_employees(
    db: AsyncSession, company_id: uuid.UUID, current_only: bool = False
) -> list[CompanyEmployeeResponse]:
    company = (
        await db.execute(select(Company).where(Company.id == company_id))
    ).scalar_one_or_none()
    if not company:
        raise NotFoundError(f"Company with id {company_id} not found.")

    stmt = (
        select(PersonCompanyRelationship, Person)
        .join(Person, Person.id == PersonCompanyRelationship.person_id)
        .where(
            PersonCompanyRelationship.company_id == company_id,
            Person.deleted_at.is_(None),
        )
    )

    if current_only:
        stmt = stmt.where(PersonCompanyRelationship.is_current.is_(True))

    stmt = stmt.order_by(
        PersonCompanyRelationship.is_current.desc(),
        PersonCompanyRelationship.started_at.desc().nullslast(),
    )

    rows = (await db.execute(stmt)).all()

    return [
        CompanyEmployeeResponse(
            relationship_id=rel.id,
            person_id=person.id,
            first_name=person.first_name,
            last_name=person.last_name,
            primary_email=person.primary_email,
            linkedin_url=person.linkedin_url,
            city=person.city,
            country=person.country,
            title=rel.title,
            is_current=rel.is_current,
            started_at=rel.started_at,
            ended_at=rel.ended_at,
            attributes=person.attributes or {},
        )
        for rel, person in rows
    ]
