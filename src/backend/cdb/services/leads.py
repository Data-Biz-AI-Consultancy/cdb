import datetime
import uuid
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import BadRequestError, NotFoundError
from cdb.models.company import Company
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


def _format_lead_response(
    lead: Lead, person: Person | None = None, company: Company | None = None
) -> LeadResponse:
    full_name = None
    email = None
    avatar = None
    if person:
        name_parts = [p for p in [person.first_name, person.last_name] if p]
        full_name = " ".join(name_parts) if name_parts else (person.primary_email or None)
        email = person.primary_email
        avatar = person.avatar_url

    comp_name = company.name if company else None
    comp_domain = company.domain if company else None

    # Derive human-friendly title if none exists
    title = (
        lead.intent.replace("_", " ").title()
        if lead.intent
        else f"Lead from {(lead.source or 'inbound').replace('_', ' ').title()}"
    )

    return LeadResponse(
        id=lead.id,
        person_id=lead.person_id,
        company_id=lead.company_id,
        owner_id=lead.owner_id,
        title=title,
        stage=lead.stage,
        source=lead.source,
        source_ref_id=lead.source_ref_id,
        intent=lead.intent,
        signal_strength=lead.signal_strength,
        notes=lead.notes,
        description=lead.notes,
        disqualification_reason=lead.disqualification_reason,
        converted_at=lead.converted_at,
        converted_opportunity_id=lead.converted_opportunity_id,
        created_at=lead.created_at,
        updated_at=lead.updated_at,
        person_name=full_name,
        person_email=email,
        person_avatar_url=avatar,
        company_name=comp_name,
        company_domain=comp_domain,
    )


async def list_leads(
    db: AsyncSession,
    q: str | None = None,
    stage: str | None = None,
    source: str | None = None,
    signal_strength: str | None = None,
    owner_id: uuid.UUID | None = None,
    person_id: uuid.UUID | None = None,
    company_id: uuid.UUID | None = None,
    limit: int = 50,
    cursor: str | None = None,
    sort: str = "created_at",
    order: str = "desc",
) -> tuple[list[LeadResponse], PaginationMetadata]:
    stmt = (
        select(Lead, Person, Company)
        .outerjoin(Person, Lead.person_id == Person.id)
        .outerjoin(Company, Lead.company_id == Company.id)
    )

    if q and q.strip():
        q_term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Lead.notes.ilike(q_term),
                Lead.intent.ilike(q_term),
                Lead.source.ilike(q_term),
                Person.first_name.ilike(q_term),
                Person.last_name.ilike(q_term),
                Person.primary_email.ilike(q_term),
                Company.name.ilike(q_term),
            )
        )
    if stage:
        stmt = stmt.where(Lead.stage == stage)
    if source:
        stmt = stmt.where(Lead.source == source)
    if signal_strength:
        stmt = stmt.where(Lead.signal_strength == signal_strength)
    if owner_id:
        stmt = stmt.where(Lead.owner_id == owner_id)
    if person_id:
        stmt = stmt.where(Lead.person_id == person_id)
    if company_id:
        stmt = stmt.where(Lead.company_id == company_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    sort_col = getattr(Lead, sort, Lead.created_at)
    if order.lower() == "asc":
        stmt = stmt.order_by(sort_col.asc(), Lead.id.asc())
    else:
        stmt = stmt.order_by(sort_col.desc(), Lead.id.desc())

    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    rows = (await db.execute(stmt)).all()

    items = [_format_lead_response(lead, person, company) for lead, person, company in rows]
    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    return items, PaginationMetadata(next_cursor=next_cursor, has_more=has_more, total=total)


async def create_lead(db: AsyncSession, data: LeadCreate) -> LeadResponse:
    # Verify person
    p = (await db.execute(select(Person).where(Person.id == data.person_id))).scalar_one_or_none()
    if not p:
        raise NotFoundError(f"Person {data.person_id} not found.")

    comp = None
    if data.company_id:
        comp = (
            await db.execute(select(Company).where(Company.id == data.company_id))
        ).scalar_one_or_none()

    lead_notes = data.description if data.description is not None else data.notes

    lead = Lead(
        person_id=data.person_id,
        company_id=data.company_id,
        owner_id=data.owner_id,
        stage=data.stage,
        source=data.source,
        source_ref_id=data.source_ref_id,
        intent=data.intent,
        signal_strength=data.signal_strength,
        notes=lead_notes,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return _format_lead_response(lead, p, comp)


async def get_lead(db: AsyncSession, lead_id: uuid.UUID) -> LeadResponse:
    stmt = (
        select(Lead, Person, Company)
        .outerjoin(Person, Lead.person_id == Person.id)
        .outerjoin(Company, Lead.company_id == Company.id)
        .where(Lead.id == lead_id)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        raise NotFoundError(f"Lead with id {lead_id} not found.")
    lead, person, company = row
    return _format_lead_response(lead, person, company)


async def update_lead(db: AsyncSession, lead_id: uuid.UUID, data: LeadUpdate) -> LeadResponse:
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()
    if not lead:
        raise NotFoundError(f"Lead with id {lead_id} not found.")

    update_dict = data.model_dump(exclude_unset=True)
    if "description" in update_dict:
        desc_val = update_dict.pop("description")
        if desc_val is not None:
            lead.notes = desc_val

    for k, v in update_dict.items():
        if hasattr(lead, k):
            setattr(lead, k, v)

    await db.commit()
    await db.refresh(lead)
    return await get_lead(db, lead_id)


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
    return await get_lead(db, lead_id)


async def disqualify_lead(
    db: AsyncSession, lead_id: uuid.UUID, data: LeadDisqualify
) -> LeadResponse:
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
    return await get_lead(db, lead_id)


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
    db.add(
        OpportunityPerson(opportunity_id=opp.id, person_id=lead.person_id, role="decision_maker")
    )
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
