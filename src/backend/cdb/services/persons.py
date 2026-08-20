import datetime
import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import ConflictError, NotFoundError
from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.lead import Lead
from cdb.models.opportunity import OpportunityPerson
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.company import CompanySummaryResponse
from cdb.schemas.person import (
    CareerItemResponse,
    PersonCreate,
    PersonDetailResponse,
    PersonSummaryResponse,
    PersonUpdate,
)
from cdb.services.entity_resolution.normalise import (
    normalise_email,
    normalise_linkedin_url,
    normalise_phone,
)


async def list_persons(
    db: AsyncSession,
    q: str | None = None,
    source: str | None = None,
    country: str | None = None,
    has_open_opportunity: bool | None = None,
    has_open_lead: bool | None = None,
    include_deleted: bool = False,
    limit: int = 50,
    cursor: str | None = None,
    sort: str = "created_at",
    order: str = "desc",
) -> tuple[list[PersonSummaryResponse], PaginationMetadata]:
    stmt = select(Person)

    if not include_deleted:
        stmt = stmt.where(Person.deleted_at.is_(None))

    if q:
        search_pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Person.first_name.ilike(search_pattern),
                Person.last_name.ilike(search_pattern),
                Person.primary_email.ilike(search_pattern),
            )
        )

    if source:
        stmt = stmt.where(Person.sources.any(source))

    if country:
        stmt = stmt.where(Person.country == country.upper())

    if has_open_lead is True:
        subq_lead = select(Lead.person_id).where(Lead.stage.in_(["new", "contacted", "qualified"]))
        stmt = stmt.where(Person.id.in_(subq_lead))
    elif has_open_lead is False:
        subq_lead = select(Lead.person_id).where(Lead.stage.in_(["new", "contacted", "qualified"]))
        stmt = stmt.where(Person.id.not_in(subq_lead))

    if has_open_opportunity is True:
        from cdb.models.opportunity import Opportunity
        subq_opp = (
            select(OpportunityPerson.person_id)
            .join(Opportunity, Opportunity.id == OpportunityPerson.opportunity_id)
            .where(Opportunity.stage.in_(["prospect", "qualified", "proposal", "negotiation"]))
        )
        stmt = stmt.where(Person.id.in_(subq_opp))

    # Total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    # Sorting & Pagination
    if order.lower() == "asc":
        stmt = stmt.order_by(getattr(Person, sort, Person.created_at).asc())
    else:
        stmt = stmt.order_by(getattr(Person, sort, Person.created_at).desc())

    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    res = await db.execute(stmt)
    persons = res.scalars().all()

    items: list[PersonSummaryResponse] = []
    for p in persons:
        # Get current company and title
        rel_stmt = (
            select(PersonCompanyRelationship, Company)
            .join(Company, Company.id == PersonCompanyRelationship.company_id)
            .where(PersonCompanyRelationship.person_id == p.id, PersonCompanyRelationship.is_current.is_(True))
            .limit(1)
        )
        rel_res = (await db.execute(rel_stmt)).first()

        current_company = None
        current_title = None
        if rel_res:
            rel, comp = rel_res
            current_title = rel.title
            current_company = CompanySummaryResponse(
                id=comp.id,
                name=comp.name,
                domain=comp.domain,
                industry=comp.industry,
                country=comp.country,
            )

        # Get last activity
        act_stmt = (
            select(Activity.occurred_at)
            .where(Activity.person_id == p.id)
            .order_by(Activity.occurred_at.desc())
            .limit(1)
        )
        last_act = (await db.execute(act_stmt)).scalar_one_or_none()

        items.append(
            PersonSummaryResponse(
                id=p.id,
                first_name=p.first_name,
                last_name=p.last_name,
                primary_email=p.primary_email,
                linkedin_url=p.linkedin_url,
                current_company=current_company,
                current_title=current_title,
                sources=p.sources or [],
                last_activity_at=last_act,
                created_at=p.created_at,
            )
        )

    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    return items, PaginationMetadata(next_cursor=next_cursor, has_more=has_more, total=total)


async def create_person(db: AsyncSession, data: PersonCreate) -> Person:
    norm_email = normalise_email(data.primary_email)
    norm_li = normalise_linkedin_url(data.linkedin_url)
    norm_phone = normalise_phone(data.primary_phone)

    if norm_email:
        existing = (await db.execute(select(Person).where(Person.primary_email == norm_email))).scalar_one_or_none()
        if existing:
            raise ConflictError(f"Person with email '{norm_email}' already exists.")

    if norm_li:
        existing = (await db.execute(select(Person).where(Person.linkedin_url == norm_li))).scalar_one_or_none()
        if existing:
            raise ConflictError(f"Person with LinkedIn URL '{norm_li}' already exists.")

    person = Person(
        first_name=data.first_name,
        last_name=data.last_name,
        primary_email=norm_email,
        secondary_emails=data.secondary_emails,
        primary_phone=norm_phone,
        linkedin_url=norm_li,
        twitter_handle=data.twitter_handle,
        facebook_id=data.facebook_id,
        whatsapp_phone=data.whatsapp_phone,
        city=data.city,
        country=data.country.upper() if data.country else None,
        avatar_url=data.avatar_url,
        attributes=data.attributes,
        sources=["manual"],
        source_ids={},
    )
    db.add(person)
    await db.commit()
    await db.refresh(person)
    return person


async def get_person_detail(db: AsyncSession, person_id: uuid.UUID) -> PersonDetailResponse:
    person = (await db.execute(select(Person).where(Person.id == person_id))).scalar_one_or_none()
    if not person:
        raise NotFoundError(f"Person with id {person_id} not found.")

    # Career history
    career_stmt = (
        select(PersonCompanyRelationship, Company)
        .join(Company, Company.id == PersonCompanyRelationship.company_id)
        .where(PersonCompanyRelationship.person_id == person.id)
        .order_by(PersonCompanyRelationship.is_current.desc(), PersonCompanyRelationship.started_at.desc())
    )
    career_rows = (await db.execute(career_stmt)).all()

    career_items = [
        CareerItemResponse(
            relationship_id=r.id,
            company=CompanySummaryResponse(
                id=c.id,
                name=c.name,
                domain=c.domain,
                industry=c.industry,
                country=c.country,
            ),
            title=r.title,
            is_current=r.is_current,
            started_at=r.started_at,
            ended_at=r.ended_at,
        )
        for r, c in career_rows
    ]

    # Open leads count
    leads_count = (
        await db.execute(
            select(func.count(Lead.id)).where(
                Lead.person_id == person.id,
                Lead.stage.in_(["new", "contacted", "qualified"]),
            )
        )
    ).scalar() or 0

    # Open opportunities count
    from cdb.models.opportunity import Opportunity
    opps_count = (
        await db.execute(
            select(func.count(Opportunity.id))
            .join(OpportunityPerson, OpportunityPerson.opportunity_id == Opportunity.id)
            .where(
                OpportunityPerson.person_id == person.id,
                Opportunity.stage.in_(["prospect", "qualified", "proposal", "negotiation"]),
            )
        )
    ).scalar() or 0

    return PersonDetailResponse(
        id=person.id,
        first_name=person.first_name,
        last_name=person.last_name,
        primary_email=person.primary_email,
        secondary_emails=person.secondary_emails or [],
        primary_phone=person.primary_phone,
        linkedin_url=person.linkedin_url,
        twitter_handle=person.twitter_handle,
        facebook_id=person.facebook_id,
        whatsapp_phone=person.whatsapp_phone,
        city=person.city,
        country=person.country,
        avatar_url=person.avatar_url,
        attributes=person.attributes or {},
        sources=person.sources or [],
        source_ids=person.source_ids or {},
        career=career_items,
        open_leads_count=leads_count,
        open_opportunities_count=opps_count,
        created_at=person.created_at,
        updated_at=person.updated_at,
        deleted_at=person.deleted_at,
    )


async def update_person(db: AsyncSession, person_id: uuid.UUID, data: PersonUpdate) -> PersonDetailResponse:
    person = (await db.execute(select(Person).where(Person.id == person_id))).scalar_one_or_none()
    if not person:
        raise NotFoundError(f"Person with id {person_id} not found.")

    update_dict = data.model_dump(exclude_unset=True)
    if "primary_email" in update_dict and update_dict["primary_email"]:
        update_dict["primary_email"] = normalise_email(update_dict["primary_email"])
    if "linkedin_url" in update_dict and update_dict["linkedin_url"]:
        update_dict["linkedin_url"] = normalise_linkedin_url(update_dict["linkedin_url"])
    if "primary_phone" in update_dict and update_dict["primary_phone"]:
        update_dict["primary_phone"] = normalise_phone(update_dict["primary_phone"])
    if "country" in update_dict and update_dict["country"]:
        update_dict["country"] = update_dict["country"].upper()

    for k, v in update_dict.items():
        setattr(person, k, v)

    await db.commit()
    await db.refresh(person)
    return await get_person_detail(db, person.id)


async def delete_person(db: AsyncSession, person_id: uuid.UUID, hard: bool = False) -> None:
    person = (await db.execute(select(Person).where(Person.id == person_id))).scalar_one_or_none()
    if not person:
        raise NotFoundError(f"Person with id {person_id} not found.")

    if hard:
        await db.delete(person)
    else:
        person.deleted_at = datetime.datetime.now(datetime.UTC)

    await db.commit()
