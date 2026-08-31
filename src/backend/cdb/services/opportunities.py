import datetime
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import BadRequestError, NotFoundError
from cdb.models.company import Company
from cdb.models.opportunity import Opportunity, OpportunityCompany, OpportunityPerson
from cdb.models.opportunity_history import OpportunityHistory
from cdb.models.person import Person
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.opportunity import (
    OpportunityClose,
    OpportunityCompanyAttach,
    OpportunityCompanyResponse,
    OpportunityCreate,
    OpportunityPersonAttach,
    OpportunityPersonResponse,
    OpportunityResponse,
    OpportunityUpdate,
)
from cdb.services.opportunity_history import record_opportunity_history

OPP_STAGE_FLOW = ["prospect", "qualified", "proposal", "negotiation"]


def compute_opportunity_staleness(
    opp: Opportunity, last_history_date: datetime.datetime | None = None
) -> tuple[str, bool, bool, int, datetime.datetime | None]:
    """
    Computes staleness and expiration based on inactivity:
    - 30+ days without activities/updates -> Stale
    - 90+ days without activities/updates -> Expired
    (Closed Won / Closed Lost opportunities do not expire or become stale)
    """
    now = datetime.datetime.now(datetime.UTC)

    last_act = last_history_date or opp.updated_at or opp.created_at
    if last_act and last_act.tzinfo is None:
        last_act = last_act.replace(tzinfo=datetime.UTC)

    days_inactive = max(0, (now - last_act).days) if last_act else 0

    if opp.stage in ("closed_won", "closed_lost"):
        return opp.stage, False, False, days_inactive, last_act

    if days_inactive >= 90:
        return "expired", False, True, days_inactive, last_act
    elif days_inactive >= 30:
        return "stale", True, False, days_inactive, last_act
    else:
        return "active", False, False, days_inactive, last_act


async def list_opportunities(
    db: AsyncSession,
    stage: str | None = None,
    owner_id: uuid.UUID | None = None,
    person_id: uuid.UUID | None = None,
    company_id: uuid.UUID | None = None,
    limit: int = 50,
    cursor: str | None = None,
    sort: str = "created_at",
    order: str = "desc",
) -> tuple[list[OpportunityResponse], PaginationMetadata]:
    stmt = select(Opportunity)

    if stage:
        stmt = stmt.where(Opportunity.stage == stage)
    if owner_id:
        stmt = stmt.where(Opportunity.owner_id == owner_id)
    if person_id:
        stmt = stmt.join(
            OpportunityPerson, OpportunityPerson.opportunity_id == Opportunity.id
        ).where(OpportunityPerson.person_id == person_id)
    if company_id:
        stmt = stmt.join(
            OpportunityCompany, OpportunityCompany.opportunity_id == Opportunity.id
        ).where(OpportunityCompany.company_id == company_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    if order.lower() == "asc":
        stmt = stmt.order_by(getattr(Opportunity, sort, Opportunity.created_at).asc())
    else:
        stmt = stmt.order_by(getattr(Opportunity, sort, Opportunity.created_at).desc())

    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    opps = (await db.execute(stmt)).scalars().all()

    items: list[OpportunityResponse] = []
    for opp in opps:
        items.append(await _build_opportunity_response(db, opp))

    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    return items, PaginationMetadata(next_cursor=next_cursor, has_more=has_more, total=total)


async def _build_opportunity_response(db: AsyncSession, opp: Opportunity) -> OpportunityResponse:
    p_stmt = (
        select(OpportunityPerson, Person)
        .outerjoin(Person, OpportunityPerson.person_id == Person.id)
        .where(OpportunityPerson.opportunity_id == opp.id)
    )
    p_rows = (await db.execute(p_stmt)).all()

    c_stmt = (
        select(OpportunityCompany, Company)
        .outerjoin(Company, OpportunityCompany.company_id == Company.id)
        .where(OpportunityCompany.opportunity_id == opp.id)
    )
    c_rows = (await db.execute(c_stmt)).all()

    persons: list[OpportunityPersonResponse] = []
    for op_person, person in p_rows:
        p_name = None
        p_email = None
        p_avatar = None
        if person:
            parts = [p for p in [person.first_name, person.last_name] if p]
            p_name = " ".join(parts) if parts else (person.primary_email or None)
            p_email = person.primary_email
            p_avatar = person.avatar_url

        persons.append(
            OpportunityPersonResponse(
                person_id=op_person.person_id,
                role=op_person.role,
                person_name=p_name,
                person_email=p_email,
                person_avatar_url=p_avatar,
            )
        )

    companies: list[OpportunityCompanyResponse] = []
    for op_comp, company in c_rows:
        c_name = company.name if company else None
        c_domain = company.domain if company else None
        companies.append(
            OpportunityCompanyResponse(
                company_id=op_comp.company_id,
                role=op_comp.role,
                company_name=c_name,
                company_domain=c_domain,
            )
        )

    # Fetch latest history timestamp if exists
    latest_hist_stmt = (
        select(OpportunityHistory.created_at)
        .where(OpportunityHistory.opportunity_id == opp.id)
        .order_by(OpportunityHistory.created_at.desc())
        .limit(1)
    )
    latest_hist_at = (await db.execute(latest_hist_stmt)).scalar_one_or_none()

    staleness_status, is_stale, is_expired, days_inactive, last_activity_at = (
        compute_opportunity_staleness(opp, latest_hist_at)
    )

    is_overdue = False
    days_overdue = 0
    if opp.expected_close_date and opp.stage not in ("closed_won", "closed_lost"):
        today = datetime.datetime.now(datetime.UTC).date()
        if opp.expected_close_date < today:
            is_overdue = True
            days_overdue = (today - opp.expected_close_date).days

    return OpportunityResponse(
        id=opp.id,
        title=opp.title,
        owner_id=opp.owner_id,
        stage=opp.stage,
        value=opp.value,
        currency=opp.currency,
        probability=opp.probability,
        expected_close_date=opp.expected_close_date,
        source_lead_id=opp.source_lead_id,
        notes=opp.notes,
        description=opp.description,
        attributes=opp.attributes or {},
        persons=persons,
        companies=companies,
        created_at=opp.created_at,
        updated_at=opp.updated_at,
        is_stale=is_stale,
        is_expired=is_expired,
        days_inactive=days_inactive,
        staleness_status=staleness_status,
        last_activity_at=last_activity_at,
        is_overdue=is_overdue,
        days_overdue=days_overdue,
    )


async def create_opportunity(
    db: AsyncSession, data: OpportunityCreate, changed_by_id: uuid.UUID | None = None
) -> OpportunityResponse:
    opp = Opportunity(
        title=data.title,
        owner_id=data.owner_id or changed_by_id,
        stage=data.stage,
        value=data.value,
        currency=data.currency or "EUR",
        probability=data.probability,
        expected_close_date=data.expected_close_date,
        source_lead_id=data.source_lead_id,
        notes=data.notes,
        description=data.description,
        attributes=data.attributes or {},
    )
    db.add(opp)
    await db.flush()

    for p in data.person_ids:
        db.add(OpportunityPerson(opportunity_id=opp.id, person_id=p.person_id, role=p.role))

    for c in data.company_ids:
        db.add(OpportunityCompany(opportunity_id=opp.id, company_id=c.company_id, role=c.role))

    # Log initial creation in history
    await record_opportunity_history(
        db=db,
        opportunity_id=opp.id,
        action_id="opp_created",
        changed_by_id=changed_by_id or data.owner_id,
        summary=f"Created opportunity '{opp.title}' at stage '{opp.stage}'",
        changes={
            "title": opp.title,
            "stage": opp.stage,
            "value": str(opp.value) if opp.value is not None else None,
            "currency": opp.currency,
            "probability": opp.probability,
        },
        commit=False,
    )

    await db.commit()
    await db.refresh(opp)
    return await _build_opportunity_response(db, opp)


async def get_opportunity(db: AsyncSession, opp_id: uuid.UUID) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")
    return await _build_opportunity_response(db, opp)


async def update_opportunity(
    db: AsyncSession,
    opp_id: uuid.UUID,
    data: OpportunityUpdate,
    changed_by_id: uuid.UUID | None = None,
) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")

    update_dict = data.model_dump(exclude_unset=True)
    field_changes: dict[str, Any] = {}

    old_stage = opp.stage
    old_value = opp.value
    old_currency = opp.currency

    for k, v in update_dict.items():
        curr_v = getattr(opp, k, None)
        if curr_v != v:
            field_changes[k] = {
                "old": str(curr_v) if curr_v is not None else None,
                "new": str(v) if v is not None else None,
            }
            setattr(opp, k, v)

    # Auto-adjust probability on stage change if not explicitly overridden
    if "stage" in update_dict and "probability" not in update_dict:
        if opp.stage == "closed_won":
            opp.probability = 100
        elif opp.stage == "closed_lost":
            opp.probability = 0

    # Record history logs based on what changed
    if "stage" in update_dict and update_dict["stage"] != old_stage:
        action = (
            "deal_won"
            if opp.stage == "closed_won"
            else "deal_lost"
            if opp.stage == "closed_lost"
            else "stage_changed"
        )
        await record_opportunity_history(
            db=db,
            opportunity_id=opp.id,
            action_id=action,
            changed_by_id=changed_by_id,
            field_name="stage",
            old_value=old_stage,
            new_value=opp.stage,
            changes={"stage": {"old": old_stage, "new": opp.stage}},
            summary=f"Changed stage from {old_stage} to {opp.stage}",
            commit=False,
        )

    if ("value" in update_dict or "currency" in update_dict) and (
        opp.value != old_value or opp.currency != old_currency
    ):
        await record_opportunity_history(
            db=db,
            opportunity_id=opp.id,
            action_id="value_updated",
            changed_by_id=changed_by_id,
            field_name="value",
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(opp.value) if opp.value is not None else None,
            changes={
                "value": {
                    "old": str(old_value) if old_value is not None else None,
                    "new": str(opp.value) if opp.value is not None else None,
                },
                "currency": {"old": old_currency, "new": opp.currency},
            },
            summary=f"Updated value to {opp.currency or '$'} {opp.value}",
            commit=False,
        )

    other_changes = {
        k: v for k, v in field_changes.items() if k not in ("stage", "value", "currency")
    }
    if other_changes:
        await record_opportunity_history(
            db=db,
            opportunity_id=opp.id,
            action_id="field_updated",
            changed_by_id=changed_by_id,
            changes=other_changes,
            summary=f"Updated fields: {', '.join(other_changes.keys())}",
            commit=False,
        )

    await db.commit()
    await db.refresh(opp)
    return await _build_opportunity_response(db, opp)


async def advance_opportunity(
    db: AsyncSession, opp_id: uuid.UUID, changed_by_id: uuid.UUID | None = None
) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")

    if opp.stage in OPP_STAGE_FLOW:
        idx = OPP_STAGE_FLOW.index(opp.stage)
        if idx < len(OPP_STAGE_FLOW) - 1:
            old_stage = opp.stage
            opp.stage = OPP_STAGE_FLOW[idx + 1]
            await record_opportunity_history(
                db=db,
                opportunity_id=opp.id,
                action_id="stage_changed",
                changed_by_id=changed_by_id,
                field_name="stage",
                old_value=old_stage,
                new_value=opp.stage,
                changes={"stage": {"old": old_stage, "new": opp.stage}},
                summary=f"Advanced deal stage from {old_stage} to {opp.stage}",
                commit=False,
            )
    elif opp.stage == "negotiation":
        raise BadRequestError(
            "Opportunity is at final negotiation stage. Use close endpoint to win or lose."
        )

    await db.commit()
    await db.refresh(opp)
    return await _build_opportunity_response(db, opp)


async def close_opportunity(
    db: AsyncSession,
    opp_id: uuid.UUID,
    data: OpportunityClose,
    changed_by_id: uuid.UUID | None = None,
) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")

    if data.outcome not in ["closed_won", "closed_lost"]:
        raise BadRequestError("Outcome must be 'closed_won' or 'closed_lost'.")

    old_stage = opp.stage
    opp.stage = data.outcome
    if data.outcome == "closed_won":
        opp.probability = 100
        action = "deal_won"
    else:
        opp.probability = 0
        action = "deal_lost"

    if data.notes:
        existing = opp.notes or ""
        opp.notes = f"{existing}\n[Closed as {data.outcome}]: {data.notes}".strip()

    await record_opportunity_history(
        db=db,
        opportunity_id=opp.id,
        action_id=action,
        changed_by_id=changed_by_id,
        field_name="stage",
        old_value=old_stage,
        new_value=opp.stage,
        changes={
            "stage": {"old": old_stage, "new": opp.stage},
            "probability": {"new": opp.probability},
            "notes": {"new": data.notes} if data.notes else None,
        },
        summary=f"Closed deal as {data.outcome.replace('_', ' ').title()}{': ' + data.notes if data.notes else ''}",
        commit=False,
    )

    await db.commit()
    await db.refresh(opp)
    return await _build_opportunity_response(db, opp)


async def attach_person_to_opportunity(
    db: AsyncSession,
    opp_id: uuid.UUID,
    data: OpportunityPersonAttach,
    changed_by_id: uuid.UUID | None = None,
) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")

    person = (
        await db.execute(select(Person).where(Person.id == data.person_id))
    ).scalar_one_or_none()
    if not person:
        raise NotFoundError(f"Person with id {data.person_id} not found.")

    existing_link = (
        await db.execute(
            select(OpportunityPerson).where(
                OpportunityPerson.opportunity_id == opp_id,
                OpportunityPerson.person_id == data.person_id,
            )
        )
    ).scalar_one_or_none()

    if existing_link:
        existing_link.role = data.role
    else:
        db.add(
            OpportunityPerson(
                opportunity_id=opp_id,
                person_id=data.person_id,
                role=data.role,
            )
        )

    person_name = (
        f"{person.first_name or ''} {person.last_name or ''}".strip()
        or person.primary_email
        or str(person.id)
    )
    await record_opportunity_history(
        db=db,
        opportunity_id=opp_id,
        action_id="person_attached",
        changed_by_id=changed_by_id,
        changes={"person_id": str(data.person_id), "person_name": person_name, "role": data.role},
        summary=f"Attached contact {person_name} as {data.role or 'contact'}",
        commit=False,
    )

    await db.commit()
    return await _build_opportunity_response(db, opp)


async def detach_person_from_opportunity(
    db: AsyncSession,
    opp_id: uuid.UUID,
    person_id: uuid.UUID,
    changed_by_id: uuid.UUID | None = None,
) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")

    link = (
        await db.execute(
            select(OpportunityPerson).where(
                OpportunityPerson.opportunity_id == opp_id,
                OpportunityPerson.person_id == person_id,
            )
        )
    ).scalar_one_or_none()

    if link:
        await db.delete(link)
        await record_opportunity_history(
            db=db,
            opportunity_id=opp_id,
            action_id="person_detached",
            changed_by_id=changed_by_id,
            changes={"person_id": str(person_id)},
            summary="Unlinked contact person from opportunity",
            commit=False,
        )
        await db.commit()

    return await _build_opportunity_response(db, opp)


async def attach_company_to_opportunity(
    db: AsyncSession,
    opp_id: uuid.UUID,
    data: OpportunityCompanyAttach,
    changed_by_id: uuid.UUID | None = None,
) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")

    company = (
        await db.execute(select(Company).where(Company.id == data.company_id))
    ).scalar_one_or_none()
    if not company:
        raise NotFoundError(f"Company with id {data.company_id} not found.")

    existing_link = (
        await db.execute(
            select(OpportunityCompany).where(
                OpportunityCompany.opportunity_id == opp_id,
                OpportunityCompany.company_id == data.company_id,
            )
        )
    ).scalar_one_or_none()

    if existing_link:
        existing_link.role = data.role
    else:
        db.add(
            OpportunityCompany(
                opportunity_id=opp_id,
                company_id=data.company_id,
                role=data.role,
            )
        )

    await record_opportunity_history(
        db=db,
        opportunity_id=opp_id,
        action_id="company_attached",
        changed_by_id=changed_by_id,
        changes={
            "company_id": str(data.company_id),
            "company_name": company.name,
            "role": data.role,
        },
        summary=f"Attached organization {company.name} as {data.role or 'organization'}",
        commit=False,
    )

    await db.commit()
    return await _build_opportunity_response(db, opp)


async def detach_company_from_opportunity(
    db: AsyncSession,
    opp_id: uuid.UUID,
    company_id: uuid.UUID,
    changed_by_id: uuid.UUID | None = None,
) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")

    link = (
        await db.execute(
            select(OpportunityCompany).where(
                OpportunityCompany.opportunity_id == opp_id,
                OpportunityCompany.company_id == company_id,
            )
        )
    ).scalar_one_or_none()

    if link:
        await db.delete(link)
        await record_opportunity_history(
            db=db,
            opportunity_id=opp_id,
            action_id="company_detached",
            changed_by_id=changed_by_id,
            changes={"company_id": str(company_id)},
            summary="Unlinked company organization from opportunity",
            commit=False,
        )
        await db.commit()

    return await _build_opportunity_response(db, opp)


async def delete_opportunity(db: AsyncSession, opp_id: uuid.UUID) -> None:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")
    await db.delete(opp)
    await db.commit()
