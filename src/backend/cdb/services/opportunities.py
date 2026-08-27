import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import BadRequestError, NotFoundError
from cdb.models.opportunity import Opportunity, OpportunityCompany, OpportunityPerson
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.opportunity import (
    OpportunityClose,
    OpportunityCompanyResponse,
    OpportunityCreate,
    OpportunityPersonResponse,
    OpportunityResponse,
    OpportunityUpdate,
)

OPP_STAGE_FLOW = ["prospect", "qualified", "proposal", "negotiation"]


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
    p_rows = (
        (
            await db.execute(
                select(OpportunityPerson).where(OpportunityPerson.opportunity_id == opp.id)
            )
        )
        .scalars()
        .all()
    )

    c_rows = (
        (
            await db.execute(
                select(OpportunityCompany).where(OpportunityCompany.opportunity_id == opp.id)
            )
        )
        .scalars()
        .all()
    )

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
        attributes=opp.attributes or {},
        persons=[OpportunityPersonResponse(person_id=p.person_id, role=p.role) for p in p_rows],
        companies=[
            OpportunityCompanyResponse(company_id=c.company_id, role=c.role) for c in c_rows
        ],
        created_at=opp.created_at,
        updated_at=opp.updated_at,
    )


async def create_opportunity(db: AsyncSession, data: OpportunityCreate) -> OpportunityResponse:
    opp = Opportunity(
        title=data.title,
        owner_id=data.owner_id,
        stage=data.stage,
        value=data.value,
        currency=data.currency,
        probability=data.probability,
        expected_close_date=data.expected_close_date,
        source_lead_id=data.source_lead_id,
        notes=data.notes,
        attributes=data.attributes,
    )
    db.add(opp)
    await db.flush()

    for p in data.person_ids:
        db.add(OpportunityPerson(opportunity_id=opp.id, person_id=p.person_id, role=p.role))

    for c in data.company_ids:
        db.add(OpportunityCompany(opportunity_id=opp.id, company_id=c.company_id, role=c.role))

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
    db: AsyncSession, opp_id: uuid.UUID, data: OpportunityUpdate
) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(opp, k, v)

    await db.commit()
    await db.refresh(opp)
    return await _build_opportunity_response(db, opp)


async def advance_opportunity(db: AsyncSession, opp_id: uuid.UUID) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")

    if opp.stage in OPP_STAGE_FLOW:
        idx = OPP_STAGE_FLOW.index(opp.stage)
        if idx < len(OPP_STAGE_FLOW) - 1:
            opp.stage = OPP_STAGE_FLOW[idx + 1]
    elif opp.stage == "negotiation":
        raise BadRequestError(
            "Opportunity is at final negotiation stage. Use close endpoint to win or lose."
        )

    await db.commit()
    await db.refresh(opp)
    return await _build_opportunity_response(db, opp)


async def close_opportunity(
    db: AsyncSession, opp_id: uuid.UUID, data: OpportunityClose
) -> OpportunityResponse:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")

    if data.outcome not in ["closed_won", "closed_lost"]:
        raise BadRequestError("Outcome must be 'closed_won' or 'closed_lost'.")

    opp.stage = data.outcome
    if data.outcome == "closed_won":
        opp.probability = 100
    elif data.outcome == "closed_lost":
        opp.probability = 0

    if data.notes:
        existing = opp.notes or ""
        opp.notes = f"{existing}\n[Closed as {data.outcome}]: {data.notes}".strip()

    await db.commit()
    await db.refresh(opp)
    return await _build_opportunity_response(db, opp)


async def delete_opportunity(db: AsyncSession, opp_id: uuid.UUID) -> None:
    opp = (
        await db.execute(select(Opportunity).where(Opportunity.id == opp_id))
    ).scalar_one_or_none()
    if not opp:
        raise NotFoundError(f"Opportunity with id {opp_id} not found.")
    await db.delete(opp)
    await db.commit()
