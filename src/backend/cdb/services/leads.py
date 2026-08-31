import datetime
import uuid
from decimal import Decimal

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import BadRequestError, NotFoundError
from cdb.models.company import Company
from cdb.models.lead import Lead
from cdb.models.opportunity import Opportunity, OpportunityCompany, OpportunityPerson
from cdb.models.person import Person
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.lead import (
    LeadAdvance,
    LeadBulkConvert,
    LeadBulkDelete,
    LeadBulkDisqualify,
    LeadBulkUpdate,
    LeadConvert,
    LeadCreate,
    LeadDisqualify,
    LeadResponse,
    LeadUpdate,
)
from cdb.schemas.opportunity import OpportunityResponse
from cdb.schemas.person import BulkOperationResult

STAGE_FLOW = ["new", "contacted", "qualified"]


def compute_lead_staleness(
    lead: Lead,
) -> tuple[str, bool, bool, int, datetime.datetime]:
    """Calculate lead staleness based on inactivity:
    - Inactive > 30 days -> Stale
    - Inactive > 90 days -> Expired (auto-resolved)
    """
    now = datetime.datetime.now(datetime.UTC)

    # For leads in 'new' stage without progress actions, measure from created_at.
    # For leads that have been advanced/updated, measure from updated_at.
    if lead.stage == "new":
        last_act = lead.created_at or lead.updated_at
    else:
        last_act = lead.updated_at or lead.created_at

    if last_act.tzinfo is None:
        last_act = last_act.replace(tzinfo=datetime.UTC)

    diff = now - last_act
    days_inactive = max(0, diff.days)

    if lead.stage in ("converted", "disqualified"):
        return lead.stage, False, False, days_inactive, last_act

    if days_inactive >= 90 or lead.stage == "expired":
        return "expired", True, True, days_inactive, last_act
    elif days_inactive >= 30 or lead.stage == "stale":
        return "stale", True, False, days_inactive, last_act
    else:
        return "active", False, False, days_inactive, last_act


def generate_lead_title(
    notes: str | None, intent: str | None = None, person_name: str | None = None
) -> str:
    """Generate a concise title summarizing the lead's notes/conversation."""
    if not notes or not notes.strip():
        if intent:
            return intent.replace("_", " ").title()
        return f"Inbound Lead{f' — {person_name}' if person_name else ''}"

    cleaned = notes.strip()
    lines = [line.strip() for line in cleaned.split("\n") if line.strip()]

    # Filter out metadata headers like "LinkedIn Conversation Summary (...):"
    filtered_lines = [
        line
        for line in lines
        if not line.startswith("LinkedIn Conversation Summary")
        and not line.startswith("Conversation Transcript:")
        and not line.startswith("[Bulk Update]")
        and not line.startswith("[Bulk Disqualified")
        and not line.startswith("[Disqualified")
    ]

    candidate = filtered_lines[0] if filtered_lines else lines[0]

    # Clean speaker prefixes like "Abdul: Congrats on the new role!"
    if ":" in candidate:
        prefix, remainder = candidate.split(":", 1)
        if len(prefix.strip()) < 25 and remainder.strip():
            candidate = remainder.strip()

    # Truncate if too long
    if len(candidate) > 65:
        candidate = candidate[:62].rstrip() + "..."

    if candidate:
        return candidate[0].upper() + candidate[1:]

    if intent:
        return intent.replace("_", " ").title()
    return "Inbound Inquiry"


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

    # Derive human-friendly title / summary from notes or intent
    lead_title = getattr(lead, "title", None)
    title = (
        lead_title
        if (lead_title and lead_title.strip())
        else generate_lead_title(lead.notes, lead.intent, full_name)
    )

    staleness_status, is_stale, is_expired, days_inactive, last_activity_at = (
        compute_lead_staleness(lead)
    )

    # Effective stage for display if lead has become stale or expired
    effective_stage = lead.stage
    if lead.stage not in ("converted", "disqualified"):
        if is_expired or lead.stage == "expired":
            effective_stage = "expired"
        elif is_stale or lead.stage == "stale":
            effective_stage = "stale"

    return LeadResponse(
        id=lead.id,
        person_id=lead.person_id,
        company_id=lead.company_id,
        owner_id=lead.owner_id,
        title=title,
        stage=effective_stage,
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
        is_stale=is_stale,
        is_expired=is_expired,
        days_inactive=days_inactive,
        staleness_status=staleness_status,
        last_activity_at=last_activity_at,
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
    page: int | None = None,
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
        now_dt = datetime.datetime.now(datetime.UTC)
        thirty_days_ago = now_dt - datetime.timedelta(days=30)
        ninety_days_ago = now_dt - datetime.timedelta(days=90)

        # For leads in 'new' stage, use created_at; for others use updated_at
        act_col = func.coalesce(Lead.created_at, Lead.updated_at)

        if stage == "stale":
            stmt = stmt.where(
                or_(
                    Lead.stage == "stale",
                    and_(
                        Lead.stage.not_in(["converted", "disqualified", "expired"]),
                        act_col <= thirty_days_ago,
                        act_col > ninety_days_ago,
                    ),
                )
            )
        elif stage == "expired":
            stmt = stmt.where(
                or_(
                    Lead.stage == "expired",
                    and_(
                        Lead.stage.not_in(["converted", "disqualified"]),
                        act_col <= ninety_days_ago,
                    ),
                )
            )
        else:
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
    if page is not None and page >= 1:
        offset = (page - 1) * limit
    elif cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    rows = (await db.execute(stmt)).all()

    items = [_format_lead_response(lead, person, company) for lead, person, company in rows]
    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    return items, PaginationMetadata(
        page=page,
        page_size=limit,
        next_cursor=next_cursor,
        has_more=has_more,
        total=total,
    )


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


async def bulk_update_leads(db: AsyncSession, data: LeadBulkUpdate) -> BulkOperationResult:
    if not data.lead_ids:
        return BulkOperationResult(
            success=True,
            updated_count=0,
            affected_ids=[],
            message="No leads specified for bulk update.",
        )

    stmt = select(Lead).where(Lead.id.in_(data.lead_ids))
    leads = (await db.execute(stmt)).scalars().all()

    updated_ids: list[uuid.UUID] = []
    for lead in leads:
        if data.stage is not None and data.stage.strip():
            lead.stage = data.stage.strip()
        if data.signal_strength is not None and data.signal_strength.strip():
            lead.signal_strength = data.signal_strength.strip()
        if data.source is not None and data.source.strip():
            lead.source = data.source.strip()
        if data.intent is not None and data.intent.strip():
            lead.intent = data.intent.strip()
        if data.disqualification_reason is not None and data.disqualification_reason.strip():
            lead.disqualification_reason = data.disqualification_reason.strip()

        # Note updates / appending
        if data.notes is not None:
            lead.notes = data.notes
        elif data.description is not None:
            lead.notes = data.description

        if data.append_notes and data.append_notes.strip():
            curr_notes = lead.notes or ""
            lead.notes = f"{curr_notes}\n[Bulk Update]: {data.append_notes.strip()}".strip()

        updated_ids.append(lead.id)

    await db.commit()
    return BulkOperationResult(
        success=True,
        updated_count=len(updated_ids),
        affected_ids=updated_ids,
        message=f"Successfully bulk updated {len(updated_ids)} leads.",
    )


async def bulk_delete_leads(db: AsyncSession, data: LeadBulkDelete) -> BulkOperationResult:
    if not data.lead_ids:
        return BulkOperationResult(
            success=True,
            updated_count=0,
            affected_ids=[],
            message="No leads specified for bulk delete.",
        )

    stmt = select(Lead).where(Lead.id.in_(data.lead_ids))
    leads = (await db.execute(stmt)).scalars().all()

    deleted_ids: list[uuid.UUID] = []
    for lead in leads:
        deleted_ids.append(lead.id)
        await db.delete(lead)

    await db.commit()
    return BulkOperationResult(
        success=True,
        updated_count=len(deleted_ids),
        affected_ids=deleted_ids,
        message=f"Successfully deleted {len(deleted_ids)} leads.",
    )


async def bulk_convert_leads(db: AsyncSession, data: LeadBulkConvert) -> BulkOperationResult:
    if not data.lead_ids:
        return BulkOperationResult(
            success=True,
            updated_count=0,
            affected_ids=[],
            message="No leads specified for bulk conversion.",
        )

    stmt = (
        select(Lead, Person, Company)
        .outerjoin(Person, Lead.person_id == Person.id)
        .outerjoin(Company, Lead.company_id == Company.id)
        .where(Lead.id.in_(data.lead_ids))
    )
    rows = (await db.execute(stmt)).all()

    converted_ids: list[uuid.UUID] = []
    for lead, person, company in rows:
        if lead.stage == "converted":
            continue

        person_name = (
            f"{person.first_name or ''} {person.last_name or ''}".strip() if person else ""
        )
        comp_name = company.name if company else ""
        entity_name = person_name or comp_name or getattr(lead, "title", None) or "New Lead"
        title_suffix = data.title_suffix or "— Opportunity Deal"
        opp_title = f"{entity_name} {title_suffix}".strip()

        opp = Opportunity(
            title=opp_title,
            owner_id=lead.owner_id,
            stage="prospect",
            value=Decimal(str(data.default_value)) if data.default_value is not None else None,
            currency=data.currency or "EUR",
            probability=50,
            expected_close_date=data.expected_close_date,
            source_lead_id=lead.id,
            notes=lead.notes,
        )
        db.add(opp)
        await db.flush()

        db.add(
            OpportunityPerson(
                opportunity_id=opp.id, person_id=lead.person_id, role="decision_maker"
            )
        )
        if lead.company_id:
            db.add(
                OpportunityCompany(opportunity_id=opp.id, company_id=lead.company_id, role="client")
            )

        lead.stage = "converted"
        lead.converted_at = datetime.datetime.now(datetime.UTC)
        lead.converted_opportunity_id = opp.id
        converted_ids.append(lead.id)

    await db.commit()
    return BulkOperationResult(
        success=True,
        updated_count=len(converted_ids),
        affected_ids=converted_ids,
        message=f"Successfully converted {len(converted_ids)} leads to opportunities.",
    )


async def bulk_disqualify_leads(db: AsyncSession, data: LeadBulkDisqualify) -> BulkOperationResult:
    if not data.lead_ids:
        return BulkOperationResult(
            success=True,
            updated_count=0,
            affected_ids=[],
            message="No leads specified for bulk disqualification.",
        )

    stmt = select(Lead).where(Lead.id.in_(data.lead_ids))
    leads = (await db.execute(stmt)).scalars().all()

    disqualified_ids: list[uuid.UUID] = []
    for lead in leads:
        lead.stage = "disqualified"
        lead.disqualification_reason = data.reason
        if data.notes and data.notes.strip():
            existing_notes = lead.notes or ""
            lead.notes = f"{existing_notes}\n[Bulk Disqualified: {data.reason}]: {data.notes.strip()}".strip()
        disqualified_ids.append(lead.id)

    await db.commit()
    return BulkOperationResult(
        success=True,
        updated_count=len(disqualified_ids),
        affected_ids=disqualified_ids,
        message=f"Successfully disqualified {len(disqualified_ids)} leads.",
    )
