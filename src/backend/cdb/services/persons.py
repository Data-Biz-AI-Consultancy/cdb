import datetime
import uuid
from typing import Any

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
    BulkOperationResult,
    CareerItemResponse,
    PersonBulkDelete,
    PersonBulkUpdate,
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
from cdb.services.person_history import record_person_history


def _clean_sources(src: Any) -> list[str]:
    if src is None:
        return []
    if isinstance(src, str):
        s = src.strip()
        if (s.startswith("[") and s.endswith("]")) or (s.startswith("{") and s.endswith("}")):
            import json

            try:
                parsed = json.loads(s)
                if isinstance(parsed, list):
                    return _clean_sources(parsed)
            except Exception:
                pass
        if "," in s:
            return [part.strip() for part in s.split(",") if part.strip()]
        return [s] if s else []
    if isinstance(src, (list, tuple, set)):
        joined = "".join(str(x) for x in src)
        if (joined.startswith("[") and joined.endswith("]")) or (
            joined.startswith("{") and joined.endswith("}")
        ):
            import json

            try:
                parsed = json.loads(joined)
                if isinstance(parsed, list):
                    return _clean_sources(parsed)
            except Exception:
                pass
        out: list[str] = []
        for item in src:
            if isinstance(item, (list, tuple, set)):
                out.extend(_clean_sources(item))
            elif isinstance(item, str):
                clean_item = item.strip()
                if (clean_item.startswith("[") and clean_item.endswith("]")) or (
                    clean_item.startswith("{") and clean_item.endswith("}")
                ):
                    import json

                    try:
                        parsed = json.loads(clean_item)
                        if isinstance(parsed, list):
                            out.extend(_clean_sources(parsed))
                            continue
                    except Exception:
                        pass
                if clean_item:
                    out.append(clean_item)
            elif item is not None:
                out.append(str(item))
        return out
    return []


async def list_persons(
    db: AsyncSession,
    q: str | None = None,
    source: str | None = None,
    country: str | None = None,
    has_open_opportunity: bool | None = None,
    has_open_lead: bool | None = None,
    include_deleted: bool = False,
    limit: int = 50,
    page: int | None = None,
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
    sort_column_map = {
        "created_at": Person.created_at,
        "updated_at": Person.updated_at,
        "first_name": Person.first_name,
        "last_name": Person.last_name,
        "primary_email": Person.primary_email,
        "country": Person.country,
        "city": Person.city,
    }
    sort_col = sort_column_map.get(sort, Person.created_at)

    if order.lower() == "asc":
        stmt = stmt.order_by(sort_col.asc())
    else:
        stmt = stmt.order_by(sort_col.desc())

    if page is not None and page >= 1:
        offset = (page - 1) * limit
    elif cursor and cursor.isdigit():
        offset = int(cursor)
    else:
        offset = 0

    stmt = stmt.offset(offset).limit(limit)
    res = await db.execute(stmt)
    persons = res.scalars().all()

    items: list[PersonSummaryResponse] = []
    for p in persons:
        # Get current company and title
        rel_stmt = (
            select(PersonCompanyRelationship, Company)
            .join(Company, Company.id == PersonCompanyRelationship.company_id)
            .where(
                PersonCompanyRelationship.person_id == p.id,
                PersonCompanyRelationship.is_current.is_(True),
            )
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
                primary_phone=p.primary_phone,
                linkedin_url=p.linkedin_url,
                city=p.city,
                country=p.country,
                current_company=current_company,
                current_title=current_title,
                sources=_clean_sources(p.sources),
                last_activity_at=last_act,
                created_at=p.created_at,
                updated_at=p.updated_at,
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
        existing = (
            await db.execute(select(Person).where(Person.primary_email == norm_email))
        ).scalar_one_or_none()
        if existing:
            raise ConflictError(f"Person with email '{norm_email}' already exists.")

    if norm_li:
        existing = (
            await db.execute(select(Person).where(Person.linkedin_url == norm_li))
        ).scalar_one_or_none()
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
    await db.flush()

    await record_person_history(
        db,
        person_id=person.id,
        action_id="record_created",
        summary=f"Created person record: {person.first_name or ''} {person.last_name or ''}".strip(),
    )

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
        .order_by(
            PersonCompanyRelationship.is_current.desc(), PersonCompanyRelationship.started_at.desc()
        )
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
        sources=_clean_sources(person.sources),
        source_ids=person.source_ids or {},
        career=career_items,
        open_leads_count=leads_count,
        open_opportunities_count=opps_count,
        created_at=person.created_at,
        updated_at=person.updated_at,
        deleted_at=person.deleted_at,
    )


async def update_person(
    db: AsyncSession, person_id: uuid.UUID, data: PersonUpdate
) -> PersonDetailResponse:
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

    diff_changes: dict[str, Any] = {}
    for k, v in update_dict.items():
        old_v = getattr(person, k)
        if old_v != v:
            diff_changes[k] = {"old": old_v, "new": v}
        setattr(person, k, v)

    if diff_changes:
        await record_person_history(
            db,
            person_id=person.id,
            action_id="profile_updated",
            changes=diff_changes,
            summary=f"Updated profile fields: {', '.join(diff_changes.keys())}",
        )

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


async def bulk_update_persons(db: AsyncSession, data: PersonBulkUpdate) -> BulkOperationResult:
    if not data.person_ids:
        return BulkOperationResult(
            success=True,
            updated_count=0,
            affected_ids=[],
            message="No persons specified for bulk update.",
        )

    stmt = select(Person).where(Person.id.in_(data.person_ids), Person.deleted_at.is_(None))
    res = await db.execute(stmt)
    persons = res.scalars().all()

    now = datetime.datetime.now(datetime.UTC)
    for p in persons:
        diff_changes: dict[str, Any] = {}
        if data.city is not None and p.city != data.city.strip():
            diff_changes["city"] = {"old": p.city, "new": data.city.strip() or None}
            p.city = data.city.strip() if data.city.strip() else None
        if data.country is not None and p.country != data.country.strip().upper():
            diff_changes["country"] = {
                "old": p.country,
                "new": data.country.strip().upper() or None,
            }
            p.country = data.country.strip().upper() if data.country.strip() else None
        if data.add_sources:
            cur = _clean_sources(p.sources)
            for s in data.add_sources:
                clean_s = s.strip()
                if clean_s and clean_s not in cur:
                    cur.append(clean_s)
            p.sources = cur
        if data.remove_sources:
            cur = [s for s in _clean_sources(p.sources) if s not in data.remove_sources]
            p.sources = cur
        if data.attributes is not None:
            attrs = dict(p.attributes or {})
            attrs.update(data.attributes)
            p.attributes = attrs
        p.updated_at = now

        await record_person_history(
            db,
            person_id=p.id,
            action_id="bulk_updated",
            changes=diff_changes,
            summary="Updated via bulk batch operation",
        )

    await db.commit()

    affected_ids = [p.id for p in persons]
    return BulkOperationResult(
        success=True,
        updated_count=len(affected_ids),
        affected_ids=affected_ids,
        message=f"Successfully updated {len(affected_ids)} person(s).",
    )


async def bulk_delete_persons(db: AsyncSession, data: PersonBulkDelete) -> BulkOperationResult:
    if not data.person_ids:
        return BulkOperationResult(
            success=True,
            updated_count=0,
            affected_ids=[],
            message="No persons specified for bulk delete.",
        )

    stmt = select(Person).where(Person.id.in_(data.person_ids))
    res = await db.execute(stmt)
    persons = res.scalars().all()

    now = datetime.datetime.now(datetime.UTC)
    affected_ids = [p.id for p in persons]

    for p in persons:
        if data.hard:
            await db.delete(p)
        else:
            p.deleted_at = now

    await db.commit()

    action = "permanently deleted" if data.hard else "soft deleted"
    return BulkOperationResult(
        success=True,
        updated_count=len(affected_ids),
        affected_ids=affected_ids,
        message=f"Successfully {action} {len(affected_ids)} person(s).",
    )
