import datetime
import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import BadRequestError, NotFoundError
from cdb.models.lead import Lead
from cdb.models.opportunity import Opportunity, OpportunityCompany, OpportunityPerson
from cdb.models.person import Person
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.lead import (
    LeadAdvance,
    LeadConvert,
    LeadCreate,
    LeadDisqualify,
    LeadResponse,
    LeadUpdate,
)
from cdb.schemas.opportunity import OpportunityResponse

STAGE_FLOW = ["new", "contacted", "qualified"]


async def list_leads(
    db: AsyncSession,
    stage: str | None = None,
    source: str | None = None,
    owner_id: uuid.UUID | None = None,
    person_id: uuid.UUID | None = None,
    company_id: uuid.UUID | None = None,
    limit: int = 50,
    cursor: str | None = None,
    sort: str = "created_at",
    order: str = "desc",
) -> tuple[list[LeadResponse], PaginationMetadata]:
    stmt = select(Lead)

    if stage:
        stmt = stmt.where(Lead.stage == stage)
    if source:
        stmt = stmt.where(Lead.source == source)
    if owner_id:
        stmt = stmt.where(Lead.owner_id == owner_id)
    if person_id:
        stmt = stmt.where(Lead.person_id == person_id)
    if company_id:
        stmt = stmt.where(Lead.company_id == company_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    if order.lower() == "asc":
        stmt = stmt.order_by(getattr(Lead, sort, Lead.created_at).asc())
    else:
        stmt = stmt.order_by(getattr(Lead, sort, Lead.created_at).desc())

    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    leads = (await db.execute(stmt)).scalars().all()

    items = [LeadResponse.model_validate(lead_item) for lead_item in leads]
    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    return items, PaginationMetadata(next_cursor=next_cursor, has_more=has_more, total=total)


async def create_lead(db: AsyncSession, data: LeadCreate) -> LeadResponse:
    # Verify person
    p = (await db.execute(select(Person).where(Person.id == data.person_id))).scalar_one_or_none()
    if not p:
        raise NotFoundError(f"Person {data.person_id} not found.")

    lead = Lead(
        person_id=data.person_id,
        company_id=data.company_id,
        owner_id=data.owner_id,
        stage=data.stage,
        source=data.source,
        source_ref_id=data.source_ref_id,
        intent=data.intent,
        signal_strength=data.signal_strength,
        notes=data.notes,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


async def get_lead(db: AsyncSession, lead_id: uuid.UUID) -> LeadResponse:
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise NotFoundError(f"Lead with id {lead_id} not found.")
    return LeadResponse.model_validate(lead)


async def update_lead(db: AsyncSession, lead_id: uuid.UUID, data: LeadUpdate) -> LeadResponse:
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise NotFoundError(f"Lead with id {lead_id} not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(lead, k, v)

    await db.commit()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


async def advance_lead(db: AsyncSession, lead_id: uuid.UUID, data: LeadAdvance) -> LeadResponse:
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise NotFoundError(f"Lead with id {lead_id} not found.")

    if lead.stage in STAGE_FLOW:
        idx = STAGE_FLOW.index(lead.stage)
        if idx < len(STAGE_FLOW) - 1:
            lead.stage = STAGE_FLOW[idx + 1]
    elif lead.stage == "qualified":
        raise BadRequestError("Lead is already qualified. Use convert to create an opportunity.")

    if data.notes:
        existing_notes = lead.notes or ""
        lead.notes = f"{existing_notes}\n[Advanced to {lead.stage}]: {data.notes}".strip()

    await db.commit()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


async def disqualify_lead(db: AsyncSession, lead_id: uuid.UUID, data: LeadDisqualify) -> LeadResponse:
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise NotFoundError(f"Lead with id {lead_id} not found.")

    lead.stage = "disqualified"
    lead.disqualification_reason = data.reason
    if data.notes:
        existing_notes = lead.notes or ""
        lead.notes = f"{existing_notes}\n[Disqualified: {data.reason}]: {data.notes}".strip()

    await db.commit()
    await db.refresh(lead)
    return LeadResponse.model_validate(lead)


async def convert_lead_to_opportunity(
    db: AsyncSession, lead_id: uuid.UUID, data: LeadConvert
) -> OpportunityResponse:
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise NotFoundError(f"Lead with id {lead_id} not found.")

    opp = Opportunity(
        title=data.title,
        owner_id=lead.owner_id,
        stage="prospect",
        value=Decimal(str(data.value)) if data.value is not None else None,
        currency=data.currency or "EUR",
        probability=50,
        expected_close_date=data.expected_close_date,
        source_lead_id=lead.id,
        notes=lead.notes,
    )
    db.add(opp)
    await db.flush()

    # Link person and company to opportunity
    db.add(OpportunityPerson(opportunity_id=opp.id, person_id=lead.person_id, role="decision_maker"))
    if lead.company_id:
        db.add(OpportunityCompany(opportunity_id=opp.id, company_id=lead.company_id, role="client"))

    # Update lead status
    lead.stage = "converted"
    lead.converted_at = datetime.datetime.now(datetime.UTC)
    lead.converted_opportunity_id = opp.id

    await db.commit()
    await db.refresh(opp)

    from cdb.services.opportunities import get_opportunity
    return await get_opportunity(db, opp.id)
