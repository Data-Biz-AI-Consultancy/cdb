import datetime
import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import NotFoundError
from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.engagement import Engagement, EngagementPerson
from cdb.models.opportunity import Opportunity
from cdb.models.person import Person
from cdb.schemas.activity import ActivityResponse
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.engagement import (
    EngagementActivityCreate,
    EngagementCompanyResponse,
    EngagementCreate,
    EngagementPersonAttach,
    EngagementPersonResponse,
    EngagementResponse,
    EngagementUpdate,
)


def compute_engagement_metrics(
    eng: Engagement,
    recent_activity_title: str | None = None,
) -> tuple[bool, int | None, int | None, str | None]:
    """
    Computes timeline progress, overdue status, and days remaining for an engagement.
    """
    today = datetime.datetime.now(datetime.UTC).date()
    is_overdue = False
    days_remaining = None
    days_elapsed = None

    if eng.start_date:
        days_elapsed = max(0, (today - eng.start_date).days)
    elif eng.created_at:
        created_date = eng.created_at.date()
        days_elapsed = max(0, (today - created_date).days)

    if eng.expected_end_date:
        if eng.status not in ("completed", "cancelled"):
            if eng.expected_end_date < today:
                is_overdue = True
                days_remaining = (today - eng.expected_end_date).days * -1
            else:
                days_remaining = (eng.expected_end_date - today).days

    return is_overdue, days_remaining, days_elapsed, recent_activity_title


async def _build_engagement_response(
    db: AsyncSession,
    eng: Engagement,
) -> EngagementResponse:
    # 1. Company
    company_obj = None
    if eng.company:
        company_obj = EngagementCompanyResponse(
            id=eng.company.id,
            name=eng.company.name,
            domain=eng.company.domain,
        )
    elif eng.company_id:
        c = (
            await db.execute(select(Company).where(Company.id == eng.company_id))
        ).scalar_one_or_none()
        if c:
            company_obj = EngagementCompanyResponse(id=c.id, name=c.name, domain=c.domain)

    # 2. Persons
    p_stmt = (
        select(EngagementPerson, Person)
        .outerjoin(Person, EngagementPerson.person_id == Person.id)
        .where(EngagementPerson.engagement_id == eng.id)
    )
    p_rows = (await db.execute(p_stmt)).all()

    persons: list[EngagementPersonResponse] = []
    for ep, person in p_rows:
        p_name = None
        p_email = None
        p_avatar = None
        if person:
            parts = [p for p in [person.first_name, person.last_name] if p]
            p_name = " ".join(parts) if parts else (person.primary_email or None)
            p_email = person.primary_email
            p_avatar = person.avatar_url

        persons.append(
            EngagementPersonResponse(
                person_id=ep.person_id,
                role=ep.role,
                person_name=p_name,
                person_email=p_email,
                person_avatar_url=p_avatar,
            )
        )

    # 3. Latest Activity
    latest_act_stmt = (
        select(Activity.title)
        .where(
            or_(
                Activity.engagement_id == eng.id,
                Activity.company_id == eng.company_id,
            )
        )
        .order_by(Activity.occurred_at.desc())
        .limit(1)
    )
    latest_act_title = (await db.execute(latest_act_stmt)).scalar_one_or_none()

    is_overdue, days_remaining, days_elapsed, recent_activity = compute_engagement_metrics(
        eng, latest_act_title
    )

    return EngagementResponse(
        id=eng.id,
        title=eng.title,
        company_id=eng.company_id,
        opportunity_id=eng.opportunity_id,
        owner_id=eng.owner_id,
        status=eng.status,
        engagement_type=eng.engagement_type,
        rate_type=eng.rate_type,
        rate_value=eng.rate_value,
        currency=eng.currency,
        total_value=eng.total_value,
        contract_ref=eng.contract_ref,
        contract_status=eng.contract_status,
        signed_at=eng.signed_at,
        terms_and_conditions=eng.terms_and_conditions,
        start_date=eng.start_date,
        expected_end_date=eng.expected_end_date,
        actual_end_date=eng.actual_end_date,
        notes=eng.notes,
        description=eng.description,
        attributes=eng.attributes or {},
        created_at=eng.created_at,
        updated_at=eng.updated_at,
        company=company_obj,
        persons=persons,
        is_overdue=is_overdue,
        days_remaining=days_remaining,
        days_elapsed=days_elapsed,
        recent_activity=recent_activity,
    )


async def list_engagements(
    db: AsyncSession,
    status: str | None = None,
    company_id: uuid.UUID | None = None,
    person_id: uuid.UUID | None = None,
    engagement_type: str | None = None,
    search: str | None = None,
    limit: int = 50,
    cursor: str | None = None,
    sort: str = "created_at",
    order: str = "desc",
) -> tuple[list[EngagementResponse], PaginationMetadata]:
    stmt = select(Engagement)

    if status:
        stmt = stmt.where(Engagement.status == status)
    if company_id:
        stmt = stmt.where(Engagement.company_id == company_id)
    if engagement_type:
        stmt = stmt.where(Engagement.engagement_type == engagement_type)
    if person_id:
        stmt = stmt.join(EngagementPerson, EngagementPerson.engagement_id == Engagement.id).where(
            EngagementPerson.person_id == person_id
        )

    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Engagement.title.ilike(pattern),
                Engagement.contract_ref.ilike(pattern),
                Engagement.description.ilike(pattern),
                Engagement.terms_and_conditions.ilike(pattern),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    sort_col = getattr(Engagement, sort, Engagement.created_at)
    if order.lower() == "asc":
        stmt = stmt.order_by(sort_col.asc())
    else:
        stmt = stmt.order_by(sort_col.desc())

    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    engs = (await db.execute(stmt)).scalars().all()

    items: list[EngagementResponse] = []
    for eng in engs:
        items.append(await _build_engagement_response(db, eng))

    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    return items, PaginationMetadata(next_cursor=next_cursor, has_more=has_more, total=total)


async def create_engagement(
    db: AsyncSession,
    data: EngagementCreate,
    owner_id: uuid.UUID | None = None,
) -> EngagementResponse:
    # Verify company exists
    company = (
        await db.execute(select(Company).where(Company.id == data.company_id))
    ).scalar_one_or_none()
    if not company:
        raise NotFoundError(f"Company with id {data.company_id} not found.")

    if data.opportunity_id:
        opp = (
            await db.execute(select(Opportunity).where(Opportunity.id == data.opportunity_id))
        ).scalar_one_or_none()
        if not opp:
            raise NotFoundError(f"Opportunity with id {data.opportunity_id} not found.")

    eng = Engagement(
        title=data.title,
        company_id=data.company_id,
        opportunity_id=data.opportunity_id,
        owner_id=data.owner_id or owner_id,
        status=data.status,
        engagement_type=data.engagement_type,
        rate_type=data.rate_type,
        rate_value=data.rate_value,
        currency=data.currency or "EUR",
        total_value=data.total_value,
        contract_ref=data.contract_ref,
        contract_status=data.contract_status,
        signed_at=data.signed_at,
        terms_and_conditions=data.terms_and_conditions,
        start_date=data.start_date,
        expected_end_date=data.expected_end_date,
        actual_end_date=data.actual_end_date,
        notes=data.notes,
        description=data.description,
        attributes=data.attributes or {},
    )
    db.add(eng)
    await db.flush()

    for p in data.person_ids:
        # Verify person exists
        person = (
            await db.execute(select(Person).where(Person.id == p.person_id))
        ).scalar_one_or_none()
        if person:
            db.add(
                EngagementPerson(
                    engagement_id=eng.id,
                    person_id=p.person_id,
                    role=p.role,
                )
            )

    await db.commit()
    await db.refresh(eng)
    return await _build_engagement_response(db, eng)


async def get_engagement(db: AsyncSession, engagement_id: uuid.UUID) -> EngagementResponse:
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")
    return await _build_engagement_response(db, eng)


async def update_engagement(
    db: AsyncSession,
    engagement_id: uuid.UUID,
    data: EngagementUpdate,
) -> EngagementResponse:
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    update_dict = data.model_dump(exclude_unset=True)

    if "company_id" in update_dict and update_dict["company_id"] != eng.company_id:
        company = (
            await db.execute(select(Company).where(Company.id == update_dict["company_id"]))
        ).scalar_one_or_none()
        if not company:
            raise NotFoundError(f"Company with id {update_dict['company_id']} not found.")

    for k, v in update_dict.items():
        setattr(eng, k, v)

    # Auto-populate actual_end_date when moving to completed if not set
    if eng.status == "completed" and not eng.actual_end_date:
        eng.actual_end_date = datetime.datetime.now(datetime.UTC).date()

    await db.commit()
    await db.refresh(eng)
    return await _build_engagement_response(db, eng)


async def delete_engagement(db: AsyncSession, engagement_id: uuid.UUID) -> None:
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")
    await db.delete(eng)
    await db.commit()


async def attach_person_to_engagement(
    db: AsyncSession,
    engagement_id: uuid.UUID,
    data: EngagementPersonAttach,
) -> EngagementResponse:
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    person = (
        await db.execute(select(Person).where(Person.id == data.person_id))
    ).scalar_one_or_none()
    if not person:
        raise NotFoundError(f"Person with id {data.person_id} not found.")

    existing = (
        await db.execute(
            select(EngagementPerson).where(
                EngagementPerson.engagement_id == engagement_id,
                EngagementPerson.person_id == data.person_id,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.role = data.role
    else:
        db.add(
            EngagementPerson(
                engagement_id=engagement_id,
                person_id=data.person_id,
                role=data.role,
            )
        )

    await db.commit()
    return await _build_engagement_response(db, eng)


async def detach_person_from_engagement(
    db: AsyncSession,
    engagement_id: uuid.UUID,
    person_id: uuid.UUID,
) -> EngagementResponse:
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    link = (
        await db.execute(
            select(EngagementPerson).where(
                EngagementPerson.engagement_id == engagement_id,
                EngagementPerson.person_id == person_id,
            )
        )
    ).scalar_one_or_none()

    if link:
        await db.delete(link)
        await db.commit()

    return await _build_engagement_response(db, eng)


async def list_engagement_activities(
    db: AsyncSession,
    engagement_id: uuid.UUID,
    limit: int = 50,
) -> list[ActivityResponse]:
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    # Fetch attached person ids
    ep_rows = (
        (
            await db.execute(
                select(EngagementPerson.person_id).where(
                    EngagementPerson.engagement_id == engagement_id
                )
            )
        )
        .scalars()
        .all()
    )

    conditions = [Activity.engagement_id == engagement_id]
    if eng.company_id:
        conditions.append(Activity.company_id == eng.company_id)
    if ep_rows:
        conditions.append(Activity.person_id.in_(ep_rows))

    stmt = (
        select(Activity).where(or_(*conditions)).order_by(Activity.occurred_at.desc()).limit(limit)
    )
    activities = (await db.execute(stmt)).scalars().all()

    return [ActivityResponse.model_validate(act) for act in activities]


async def create_engagement_activity(
    db: AsyncSession,
    engagement_id: uuid.UUID,
    data: EngagementActivityCreate,
) -> ActivityResponse:
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    act = Activity(
        engagement_id=engagement_id,
        company_id=data.company_id or eng.company_id,
        person_id=data.person_id,
        type=data.type,
        source=data.source or "manual",
        source_id=data.source_id,
        occurred_at=data.occurred_at or datetime.datetime.now(datetime.UTC),
        title=data.title,
        summary=data.summary,
        raw_content=data.raw_content,
        attributes=data.attributes or {},
    )
    db.add(act)
    await db.commit()
    await db.refresh(act)
    return ActivityResponse.model_validate(act)
