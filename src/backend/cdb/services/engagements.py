import datetime
import os
import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import NotFoundError, ValidationError
from cdb.core.storage import get_storage_provider
from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.engagement import Engagement, EngagementPerson
from cdb.models.opportunity import Opportunity
from cdb.models.person import Person
from cdb.schemas.activity import ActivityResponse
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.engagement import (
    EngagementActivityCreate,
    EngagementAISummaryActionItem,
    EngagementAISummaryResponse,
    EngagementCompanyResponse,
    EngagementContractFileMetadata,
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


def synthesize_ai_summary(
    eng: Engagement,
    company_name: str,
    persons: list[EngagementPersonResponse],
    activities: list[Activity],
) -> EngagementAISummaryResponse:
    """
    Synthesizes executive intelligence briefing from activities, meeting notes, timeline, and rate terms.
    """
    rate_str = (
        f"{eng.currency} {eng.rate_value}/{eng.rate_type}"
        if eng.rate_value
        else f"{eng.currency} engagement"
    )
    today = datetime.datetime.now(datetime.UTC).date()

    # 1. Activity analysis
    meeting_notes: list[Activity] = []
    has_risk_keywords = False
    has_positive_keywords = False

    risk_words = {
        "risk",
        "delay",
        "behind",
        "blocker",
        "issue",
        "bug",
        "urgent",
        "reschedule",
        "escalate",
        "churn",
        "dissatisfied",
        "disagree",
        "stuck",
    }
    positive_words = {
        "delighted",
        "approved",
        "success",
        "great",
        "on track",
        "milestone",
        "impressed",
        "smooth",
        "promising",
        "ready",
        "shipped",
        "deployed",
        "signed",
    }

    for act in activities:
        full_text = f"{act.title or ''} {act.summary or ''} {act.raw_content or ''}".lower()
        if (
            act.type in ("meeting", "notion_meeting_note", "note")
            or act.source == "notion"
            or "meeting" in full_text
        ):
            meeting_notes.append(act)

        if any(w in full_text for w in risk_words):
            has_risk_keywords = True
        if any(w in full_text for w in positive_words):
            has_positive_keywords = True

    # 2. Sentiment evaluation
    is_overdue = False
    if (
        eng.expected_end_date
        and eng.status not in ("completed", "cancelled")
        and eng.expected_end_date < today
    ):
        is_overdue = True

    if is_overdue:
        client_sentiment = "needs_attention"
        sentiment_reasoning = f"Engagement passed its target delivery completion date ({eng.expected_end_date.isoformat()}). Realigning on delivery timeline or contract extension is recommended."
    elif has_risk_keywords or eng.status == "on_hold":
        client_sentiment = "needs_attention"
        sentiment_reasoning = "Activity logs contain flagged risks, dependencies, or delivery items requiring management alignment."
    elif has_positive_keywords or eng.status in ("active", "in_delivery"):
        client_sentiment = "positive"
        sentiment_reasoning = f"Stable delivery velocity with {company_name}. Consistent progress reported across recent interactions."
    else:
        client_sentiment = "neutral"
        sentiment_reasoning = "Engagement is steady with baseline activity volume."

    # 3. Highlights
    highlights: list[str] = []
    if eng.contract_ref:
        highlights.append(
            f"Signed agreement in place ({eng.contract_ref}) under {eng.contract_status} status."
        )
    if eng.total_value:
        highlights.append(
            f"Contract value established at {eng.currency} {eng.total_value:,.2f} ({rate_str})."
        )
    if meeting_notes:
        latest_m = meeting_notes[0]
        m_title = latest_m.title or latest_m.summary or "Client sync"
        highlights.append(
            f"Latest meeting sync: '{m_title}' ({latest_m.occurred_at.strftime('%b %d, %Y')})."
        )
    if len(persons) > 0:
        lead = next((p for p in persons if p.role == "client_lead"), persons[0])
        highlights.append(
            f"Primary stakeholder touchpoint: {lead.person_name or 'Lead'} ({lead.role or 'Key Contact'})."
        )
    if not highlights:
        highlights.append(f"Active collaboration underway on {eng.title}.")

    # 4. Blockers & Risks
    blockers: list[str] = []
    if is_overdue:
        blockers.append(
            f"Timeline overrun: Target completion date ({eng.expected_end_date.isoformat()}) has passed."
        )
    if eng.status == "on_hold":
        blockers.append(
            "Engagement is marked On Hold; unblocking criteria should be established with client lead."
        )
    if not meeting_notes and (today - eng.created_at.date()).days > 14:
        blockers.append(
            "No client sync or Notion meeting notes logged in the past 14 days; consider scheduling a status check-in."
        )
    if not blockers:
        blockers.append("No critical delivery blockers identified in current activity stream.")

    # 5. Prioritized Action Items
    actions: list[EngagementAISummaryActionItem] = []
    if is_overdue:
        actions.append(
            EngagementAISummaryActionItem(
                task="Align with client sponsor on updated completion schedule or contract amendment",
                priority="high",
                suggested_role="Delivery Lead / Principal",
            )
        )
    if meeting_notes:
        actions.append(
            EngagementAISummaryActionItem(
                task=f"Review and execute action items from latest sync: '{meeting_notes[0].title or 'Client Meeting'}'",
                priority="high",
                suggested_role="Technical Lead",
            )
        )
    actions.append(
        EngagementAISummaryActionItem(
            task="Share weekly sprint delivery progress demo and milestones update with client team",
            priority="medium",
            suggested_role="Client Lead",
        )
    )
    if eng.terms_and_conditions:
        actions.append(
            EngagementAISummaryActionItem(
                task="Verify milestone delivery alignment with agreed contract T&Cs",
                priority="low",
                suggested_role="Account Manager",
            )
        )

    # 6. Executive Summary
    exec_summary = (
        f"{eng.title} with {company_name} is currently {eng.status.replace('_', ' ').title()} "
        f"({rate_str}). {sentiment_reasoning} "
        f"A total of {len(activities)} activities and meeting notes have been synthesized."
    )

    return EngagementAISummaryResponse(
        executive_summary=exec_summary,
        client_sentiment=client_sentiment,
        sentiment_reasoning=sentiment_reasoning,
        key_highlights=highlights,
        blockers_and_risks=blockers,
        action_items=actions,
        activity_count_analyzed=len(activities),
        generated_at=datetime.datetime.now(datetime.UTC).isoformat(),
    )


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

    # 3. Latest Activity & Activities for AI synthesis
    act_stmt = (
        select(Activity)
        .where(
            or_(
                Activity.engagement_id == eng.id,
                Activity.company_id == eng.company_id,
            )
        )
        .order_by(Activity.occurred_at.desc())
        .limit(20)
    )
    recent_activities = (await db.execute(act_stmt)).scalars().all()
    latest_act_title = recent_activities[0].title if recent_activities else None

    is_overdue, days_remaining, days_elapsed, recent_activity = compute_engagement_metrics(
        eng, latest_act_title
    )

    # 4. AI Summary (cached in attributes or generated)
    ai_summary_obj: EngagementAISummaryResponse | None = None
    if eng.attributes and "ai_summary" in eng.attributes:
        try:
            ai_summary_obj = EngagementAISummaryResponse.model_validate(
                eng.attributes["ai_summary"]
            )
        except Exception:
            ai_summary_obj = None

    if not ai_summary_obj:
        ai_summary_obj = synthesize_ai_summary(
            eng=eng,
            company_name=company_obj.name if company_obj else "Client Company",
            persons=persons,
            activities=recent_activities,
        )

    # 5. Contract File Metadata
    contract_file_obj: EngagementContractFileMetadata | None = None
    if eng.attributes and "contract_file" in eng.attributes:
        try:
            contract_file_obj = EngagementContractFileMetadata.model_validate(
                eng.attributes["contract_file"]
            )
        except Exception:
            contract_file_obj = None

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
        ai_summary=ai_summary_obj,
        contract_file=contract_file_obj,
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


async def generate_engagement_ai_summary(
    db: AsyncSession,
    engagement_id: uuid.UUID,
) -> EngagementAISummaryResponse:
    """
    Explicitly re-runs AI synthesis across all engagement activities and persists the briefing in attributes.
    """
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    resp = await _build_engagement_response(db, eng)

    act_stmt = (
        select(Activity)
        .where(
            or_(
                Activity.engagement_id == engagement_id,
                Activity.company_id == eng.company_id,
            )
        )
        .order_by(Activity.occurred_at.desc())
        .limit(50)
    )
    activities = (await db.execute(act_stmt)).scalars().all()

    summary = synthesize_ai_summary(
        eng=eng,
        company_name=resp.company.name if resp.company else "Client Company",
        persons=resp.persons,
        activities=activities,
    )

    current_attrs = dict(eng.attributes or {})
    current_attrs["ai_summary"] = summary.model_dump()
    eng.attributes = current_attrs

    await db.commit()
    await db.refresh(eng)

    return summary


async def link_activities_to_engagement(
    db: AsyncSession,
    engagement_id: uuid.UUID,
    activity_ids: list[uuid.UUID],
) -> list[ActivityResponse]:
    """
    Manually associates existing activities (e.g. LinkedIn conversations, calls) to this engagement.
    """
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    if not activity_ids:
        return []

    stmt = select(Activity).where(Activity.id.in_(activity_ids))
    acts = (await db.execute(stmt)).scalars().all()
    for act in acts:
        act.engagement_id = engagement_id

    await db.commit()

    # Re-run AI summary with newly linked activities
    try:
        await generate_engagement_ai_summary(db, engagement_id)
    except Exception:
        pass

    return [ActivityResponse.model_validate(act) for act in acts]


async def unlink_activity_from_engagement(
    db: AsyncSession,
    engagement_id: uuid.UUID,
    activity_id: uuid.UUID,
) -> None:
    """
    Unlinks an activity from an engagement by setting activity.engagement_id = None.
    """
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    act = (
        await db.execute(
            select(Activity).where(
                Activity.id == activity_id, Activity.engagement_id == engagement_id
            )
        )
    ).scalar_one_or_none()
    if act:
        act.engagement_id = None
        await db.commit()
        try:
            await generate_engagement_ai_summary(db, engagement_id)
        except Exception:
            pass


async def upload_engagement_contract(
    db: AsyncSession,
    engagement_id: uuid.UUID,
    file_bytes: bytes,
    filename: str,
    content_type: str,
) -> EngagementResponse:
    """
    Saves an uploaded contract file (PDF/DOCX) using the storage provider,
    persisting metadata inside engagement.attributes["contract_file"].
    """
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    if not file_bytes:
        raise ValidationError("Uploaded contract file is empty.")

    # Validate file format
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg"}
    if ext not in allowed_exts:
        raise ValidationError(
            f"Unsupported file format '{ext}'. Please upload a PDF or DOCX document."
        )

    # Validate max size (25MB)
    max_bytes = 25 * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise ValidationError("Contract document exceeds the 25MB maximum size limit.")

    # Save to storage provider
    storage = get_storage_provider()
    storage_key, size_bytes = await storage.save_file(
        file_bytes=file_bytes,
        filename=filename,
        content_type=content_type or "application/pdf",
        folder=f"contracts/{engagement_id}",
    )

    now_iso = datetime.datetime.now(datetime.UTC).isoformat()
    download_url = f"/api/v1/engagements/{engagement_id}/contract/download"

    contract_metadata = {
        "filename": filename,
        "storage_key": storage_key,
        "content_type": content_type or "application/pdf",
        "size_bytes": size_bytes,
        "uploaded_at": now_iso,
        "download_url": download_url,
    }

    current_attrs = dict(eng.attributes or {})
    current_attrs["contract_file"] = contract_metadata
    eng.attributes = current_attrs

    # If contract_ref is not set, default to the uploaded filename
    if not eng.contract_ref or eng.contract_ref == "MSA-SYN-2026-088":
        eng.contract_ref = filename

    await db.commit()
    await db.refresh(eng)

    return await _build_engagement_response(db, eng)


async def get_engagement_contract_stream(
    db: AsyncSession,
    engagement_id: uuid.UUID,
) -> tuple[bytes, str, str]:
    """
    Retrieves the raw bytes, filename, and content_type for the contract file.
    """
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    contract_data = (eng.attributes or {}).get("contract_file")
    if not contract_data or "storage_key" not in contract_data:
        raise NotFoundError(f"No contract file uploaded for engagement {engagement_id}.")

    storage = get_storage_provider()
    storage_key = contract_data["storage_key"]
    filename = contract_data.get("filename", "contract.pdf")

    file_bytes, content_type = await storage.get_file_bytes(storage_key)
    return file_bytes, filename, content_type


async def delete_engagement_contract_file(
    db: AsyncSession,
    engagement_id: uuid.UUID,
) -> EngagementResponse:
    """
    Removes the uploaded contract file from storage and engagement attributes.
    """
    eng = (
        await db.execute(select(Engagement).where(Engagement.id == engagement_id))
    ).scalar_one_or_none()
    if not eng:
        raise NotFoundError(f"Engagement with id {engagement_id} not found.")

    contract_data = (eng.attributes or {}).get("contract_file")
    if contract_data and "storage_key" in contract_data:
        storage = get_storage_provider()
        await storage.delete_file(contract_data["storage_key"])

        current_attrs = dict(eng.attributes or {})
        current_attrs.pop("contract_file", None)
        eng.attributes = current_attrs

        await db.commit()
        await db.refresh(eng)

    return await _build_engagement_response(db, eng)
