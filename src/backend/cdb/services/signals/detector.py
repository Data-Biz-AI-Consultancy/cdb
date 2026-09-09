import datetime
import re
from decimal import Decimal
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.base import utc_now
from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.opportunity import Opportunity
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.signal import DetectedSignal
from cdb.services.signals.catalog import ensure_signals_dimension

# Keyword regexes
FUNDING_REGEX = re.compile(
    r"\b(seed|series\s+[abcde]|funding round|raised\s+[\$€£]?\d+|venture round|new capital|investment round)\b",
    re.IGNORECASE,
)
HIRING_REGEX = re.compile(
    r"\b(hiring data|scaling the team|growing the team|headcount growth|hiring\s+\d+\s+engineers|analytics engineer|data engineer|lead architect)\b",
    re.IGNORECASE,
)
COMPETITOR_REGEX = re.compile(
    r"\b(talking to another|evaluating alternative|competing proposal|bake-off|rfp|cheaper alternative|other consultancy|other agency|competitor|slalom|thoughtworks|accenture|deloitte)\b",
    re.IGNORECASE,
)
EXECUTIVE_TITLE_REGEX = re.compile(
    r"\b(chief|cto|cio|cdo|vp|vice president|head of data|head of engineering|director of data|director)\b",
    re.IGNORECASE,
)


async def _upsert_detected_signal(
    db: AsyncSession,
    signal_id: str,
    title: str,
    severity: str,
    summary: str | None = None,
    company_id: Any | None = None,
    person_id: Any | None = None,
    opportunity_id: Any | None = None,
    engagement_id: Any | None = None,
    activity_id: Any | None = None,
    score: Decimal | None = None,
    metadata_payload: dict[str, Any] | None = None,
    expires_at: datetime.datetime | None = None,
) -> tuple[DetectedSignal, bool]:
    """
    Inserts a new detected signal or updates an existing active/acknowledged signal
    for the exact target entity to avoid spamming duplicates.
    Returns (signal_instance, is_new).
    """
    stmt = select(DetectedSignal).where(
        DetectedSignal.signal_id == signal_id,
        DetectedSignal.status.in_(["active", "acknowledged"]),
    )

    if company_id:
        stmt = stmt.where(DetectedSignal.company_id == company_id)
    if person_id:
        stmt = stmt.where(DetectedSignal.person_id == person_id)
    if opportunity_id:
        stmt = stmt.where(DetectedSignal.opportunity_id == opportunity_id)
    if engagement_id:
        stmt = stmt.where(DetectedSignal.engagement_id == engagement_id)

    existing = (await db.execute(stmt)).scalars().first()
    now = utc_now()

    if existing:
        existing.title = title
        existing.summary = summary
        existing.severity = severity
        existing.score = score or existing.score
        existing.metadata_payload = metadata_payload or {}
        existing.activity_id = activity_id or existing.activity_id
        existing.detected_at = now
        existing.updated_at = now
        if expires_at:
            existing.expires_at = expires_at
        return existing, False

    new_sig = DetectedSignal(
        signal_id=signal_id,
        company_id=company_id,
        person_id=person_id,
        opportunity_id=opportunity_id,
        engagement_id=engagement_id,
        activity_id=activity_id,
        status="active",
        severity=severity,
        score=score,
        title=title,
        summary=summary,
        metadata_payload=metadata_payload or {},
        detected_at=now,
        expires_at=expires_at,
    )
    db.add(new_sig)
    return new_sig, True


async def detect_dormant_strategic_accounts(
    db: AsyncSession, now: datetime.datetime
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects dormant strategic accounts with past contracts, closed-won deals,
    or strategic tags that have had no touchpoints in > 60 days.
    """
    cutoff_60d = now - datetime.timedelta(days=60)

    # 1. Fetch companies that qualify as strategic
    # Has a signed engagement OR a closed-won opportunity
    companies_stmt = (
        select(Company)
        .where(Company.deleted_at.is_(None))
        .join(Engagement, Engagement.company_id == Company.id, isouter=True)
        .join(Opportunity, Opportunity.id == Engagement.opportunity_id, isouter=True)
        .where(
            or_(
                Engagement.contract_status == "signed",
                Opportunity.stage == "closed_won",
            )
        )
        .distinct()
    )
    contract_companies = (await db.execute(companies_stmt)).scalars().all()

    strategic_set: dict[Any, Company] = {c.id: c for c in contract_companies}

    # Also include companies tagged with strategic attributes
    all_companies = (
        (await db.execute(select(Company).where(Company.deleted_at.is_(None)))).scalars().all()
    )
    for c in all_companies:
        if c.id not in strategic_set and c.attributes:
            if (
                c.attributes.get("segment") == "clients_and_prospects"
                or c.attributes.get("tier") == "strategic"
            ):
                strategic_set[c.id] = c

    companies = list(strategic_set.values())

    results: list[tuple[DetectedSignal, bool]] = []

    for comp in companies:
        # Find latest activity for this company
        act_stmt = (
            select(Activity)
            .where(Activity.company_id == comp.id)
            .order_by(Activity.occurred_at.desc())
            .limit(1)
        )
        last_act = (await db.execute(act_stmt)).scalars().first()

        days_inactive = 999
        if last_act and last_act.occurred_at:
            last_dt = (
                last_act.occurred_at
                if last_act.occurred_at.tzinfo
                else last_act.occurred_at.replace(tzinfo=datetime.UTC)
            )
            days_inactive = (now - last_dt).days
            if last_dt >= cutoff_60d:
                continue  # Active, not dormant
        elif not last_act:
            days_inactive = 180  # Default long dormancy if no activity logged

        severity = "critical" if days_inactive >= 90 else "high"
        title = f"Dormant Strategic Account: {comp.name} ({days_inactive}d inactive)"
        summary = (
            f"Strategic account '{comp.name}' has had no recorded meetings, calls, or communications "
            f"for {days_inactive} days. Proactive re-engagement recommended."
        )

        res = await _upsert_detected_signal(
            db,
            signal_id="dormant_strategic_account",
            company_id=comp.id,
            activity_id=last_act.id if last_act else None,
            title=title,
            summary=summary,
            severity=severity,
            score=Decimal("85.00") if severity == "critical" else Decimal("70.00"),
            metadata_payload={"days_inactive": days_inactive, "company_name": comp.name},
        )
        results.append(res)

    return results


async def detect_expiring_contracts(
    db: AsyncSession, now: datetime.datetime
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects signed active engagements where expected_end_date is within 60 days.
    """
    today = now.date()
    cutoff_60d = today + datetime.timedelta(days=60)
    cutoff_14d_past = today - datetime.timedelta(days=14)

    stmt = select(Engagement).where(
        Engagement.contract_status == "signed",
        Engagement.status.in_(["active", "in_delivery"]),
        Engagement.expected_end_date.is_not(None),
        Engagement.expected_end_date <= cutoff_60d,
        Engagement.expected_end_date >= cutoff_14d_past,
    )
    engagements = (await db.execute(stmt)).scalars().all()

    results: list[tuple[DetectedSignal, bool]] = []
    for eng in engagements:
        days_left = (eng.expected_end_date - today).days

        if days_left <= 14:
            severity = "critical"
        elif days_left <= 30:
            severity = "high"
        else:
            severity = "medium"

        status_label = f"{days_left}d remaining" if days_left >= 0 else f"{-days_left}d overdue"
        title = f"Expiring Contract: {eng.title} ({status_label})"
        summary = (
            f"Engagement '{eng.title}' ends on {eng.expected_end_date.isoformat()} ({status_label}). "
            f"Contract status is '{eng.contract_status}'. Immediate renewal or extension review required."
        )

        res = await _upsert_detected_signal(
            db,
            signal_id="expiring_contract",
            engagement_id=eng.id,
            company_id=eng.company_id,
            opportunity_id=eng.opportunity_id,
            title=title,
            summary=summary,
            severity=severity,
            score=Decimal("90.00") if days_left <= 14 else Decimal("75.00"),
            metadata_payload={
                "days_left": days_left,
                "expected_end_date": eng.expected_end_date.isoformat(),
                "rate_type": eng.rate_type,
                "currency": eng.currency,
                "rate_value": float(eng.rate_value) if eng.rate_value else None,
            },
        )
        results.append(res)

    return results


async def detect_unanswered_conversations(
    db: AsyncSession, now: datetime.datetime
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects inbound messages or communications awaiting outbound response for > 3 days.
    """
    cutoff_3d = now - datetime.timedelta(days=3)
    cutoff_7d = now - datetime.timedelta(days=7)

    # Inspect activities of type linkedin_message, email, whatsapp
    stmt = (
        select(Activity)
        .where(
            Activity.type.in_(["linkedin_message", "email", "whatsapp"]),
            Activity.person_id.is_not(None),
            Activity.occurred_at <= cutoff_3d,
            Activity.occurred_at >= now - datetime.timedelta(days=60),
        )
        .order_by(Activity.occurred_at.desc())
    )
    activities = (await db.execute(stmt)).scalars().all()

    # Group by person to find their latest interaction
    person_latest: dict[Any, Activity] = {}
    for act in activities:
        if act.person_id not in person_latest:
            person_latest[act.person_id] = act

    results: list[tuple[DetectedSignal, bool]] = []
    for person_id, act in person_latest.items():
        act_dt = (
            act.occurred_at
            if act.occurred_at.tzinfo
            else act.occurred_at.replace(tzinfo=datetime.UTC)
        )
        days_unanswered = (now - act_dt).days

        # Check if there is any newer outbound activity for this person
        newer_act = (
            await db.scalar(
                select(func.count(Activity.id)).where(
                    Activity.person_id == person_id,
                    Activity.occurred_at > act.occurred_at,
                )
            )
            or 0
        )
        if newer_act > 0:
            continue

        person = await db.get(Person, person_id)
        person_name = f"{person.first_name} {person.last_name}" if person else "Contact"
        severity = "critical" if act_dt <= cutoff_7d else "high"

        title = f"Unanswered Thread: {person_name} ({days_unanswered}d waiting)"
        summary = (
            f"Last message from {person_name} was received on {act.occurred_at.strftime('%Y-%m-%d')} "
            f"({days_unanswered} days ago) with no recorded response."
        )

        res = await _upsert_detected_signal(
            db,
            signal_id="unanswered_conversation",
            person_id=person_id,
            company_id=act.company_id,
            activity_id=act.id,
            title=title,
            summary=summary,
            severity=severity,
            score=Decimal("95.00") if severity == "critical" else Decimal("80.00"),
            metadata_payload={
                "days_unanswered": days_unanswered,
                "channel": act.type,
                "message_occurred_at": act.occurred_at.isoformat(),
                "person_name": person_name,
            },
        )
        results.append(res)

    return results


async def detect_leadership_changes(
    db: AsyncSession, now: datetime.datetime
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects executive departures or new executive roles within the last 60 days.
    """
    cutoff_60d = (now - datetime.timedelta(days=60)).date()

    # 1. Departures (ended_at >= cutoff_60d or is_current=False with ended_at)
    dep_stmt = (
        select(PersonCompanyRelationship)
        .where(
            PersonCompanyRelationship.is_current.is_(False),
            PersonCompanyRelationship.ended_at >= cutoff_60d,
        )
        .order_by(PersonCompanyRelationship.ended_at.desc())
    )
    departures = (await db.execute(dep_stmt)).scalars().all()

    results: list[tuple[DetectedSignal, bool]] = []
    for rel in departures:
        person = await db.get(Person, rel.person_id)
        company = await db.get(Company, rel.company_id)
        person_name = f"{person.first_name} {person.last_name}" if person else "Contact"
        comp_name = company.name if company else "Company"

        title = f"Leadership Departure: {person_name} left {comp_name}"
        summary = (
            f"{person_name} transitioned away from {comp_name} (former role: {rel.title or 'Stakeholder'}). "
            "Opportunity to congratulate and explore relationships at their new destination."
        )

        res = await _upsert_detected_signal(
            db,
            signal_id="leadership_change",
            person_id=rel.person_id,
            company_id=rel.company_id,
            title=title,
            summary=summary,
            severity="high",
            score=Decimal("80.00"),
            metadata_payload={
                "event_type": "departure",
                "role": rel.title,
                "ended_at": rel.ended_at.isoformat() if rel.ended_at else None,
                "company_name": comp_name,
                "person_name": person_name,
            },
        )
        results.append(res)

    # 2. New Executive arrivals (started_at >= cutoff_60d, title matching executive regex)
    arr_stmt = (
        select(PersonCompanyRelationship)
        .where(
            PersonCompanyRelationship.is_current.is_(True),
            PersonCompanyRelationship.started_at >= cutoff_60d,
        )
        .order_by(PersonCompanyRelationship.started_at.desc())
    )
    arrivals = (await db.execute(arr_stmt)).scalars().all()

    for rel in arrivals:
        if not rel.title or not EXECUTIVE_TITLE_REGEX.search(rel.title):
            continue

        person = await db.get(Person, rel.person_id)
        company = await db.get(Company, rel.company_id)
        person_name = f"{person.first_name} {person.last_name}" if person else "Leader"
        comp_name = company.name if company else "Target Company"

        title = f"New Executive Leader: {person_name} ({rel.title}) at {comp_name}"
        summary = (
            f"{person_name} recently joined {comp_name} as {rel.title}. "
            "Fresh leadership mandates often unlock new data, AI, or advisory budgets."
        )

        res = await _upsert_detected_signal(
            db,
            signal_id="leadership_change",
            person_id=rel.person_id,
            company_id=rel.company_id,
            title=title,
            summary=summary,
            severity="high",
            score=Decimal("85.00"),
            metadata_payload={
                "event_type": "new_hire",
                "role": rel.title,
                "started_at": rel.started_at.isoformat() if rel.started_at else None,
                "company_name": comp_name,
                "person_name": person_name,
            },
        )
        results.append(res)

    return results


async def detect_hiring_funding_events(
    db: AsyncSession, now: datetime.datetime
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects mentions of funding rounds or hiring acceleration in recent interactions.
    """
    cutoff_90d = now - datetime.timedelta(days=90)

    stmt = (
        select(Activity)
        .where(
            Activity.occurred_at >= cutoff_90d,
            Activity.company_id.is_not(None),
        )
        .order_by(Activity.occurred_at.desc())
    )
    activities = (await db.execute(stmt)).scalars().all()

    results: list[tuple[DetectedSignal, bool]] = []
    seen_companies: set[Any] = set()

    for act in activities:
        content = f"{act.title or ''} {act.summary or ''} {act.raw_content or ''}"
        funding_match = FUNDING_REGEX.search(content)
        hiring_match = HIRING_REGEX.search(content)

        if not funding_match and not hiring_match:
            continue

        if act.company_id in seen_companies:
            continue
        seen_companies.add(act.company_id)

        company = await db.get(Company, act.company_id)
        comp_name = company.name if company else "Company"

        event_type = "Funding" if funding_match else "Hiring Expansion"
        matched_phrase = (funding_match or hiring_match).group(0)

        title = f"{event_type} Signal: {comp_name} ('{matched_phrase}')"
        summary = (
            f"Interaction on {act.occurred_at.strftime('%Y-%m-%d')} highlighted a growth/capital event: "
            f"'{matched_phrase}'. Potential advisory or capability acceleration opportunity."
        )

        res = await _upsert_detected_signal(
            db,
            signal_id="hiring_funding_event",
            company_id=act.company_id,
            person_id=act.person_id,
            activity_id=act.id,
            title=title,
            summary=summary,
            severity="medium",
            score=Decimal("75.00"),
            metadata_payload={
                "event_type": event_type.lower(),
                "matched_phrase": matched_phrase,
                "activity_date": act.occurred_at.isoformat(),
            },
        )
        results.append(res)

    return results


async def detect_competitor_signals(
    db: AsyncSession, now: datetime.datetime
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects competitor mentions or bake-offs in recent meeting debriefs or deal notes.
    """
    cutoff_90d = now - datetime.timedelta(days=90)

    stmt = (
        select(Activity)
        .where(Activity.occurred_at >= cutoff_90d)
        .order_by(Activity.occurred_at.desc())
    )
    activities = (await db.execute(stmt)).scalars().all()

    results: list[tuple[DetectedSignal, bool]] = []
    seen_opps: set[Any] = set()

    for act in activities:
        content = f"{act.title or ''} {act.summary or ''} {act.raw_content or ''}"
        comp_match = COMPETITOR_REGEX.search(content)
        if not comp_match:
            continue

        matched_phrase = comp_match.group(0)

        # Check if activity has an opportunity or company
        opp_id = None
        if act.engagement_id:
            eng = await db.get(Engagement, act.engagement_id)
            opp_id = eng.opportunity_id if eng else None

        target_key = opp_id or act.company_id or act.person_id
        if target_key in seen_opps:
            continue
        seen_opps.add(target_key)

        title = f"Competitor Threat: '{matched_phrase}' detected"
        summary = (
            f"Interaction on {act.occurred_at.strftime('%Y-%m-%d')} indicated competitor or alternative evaluation: "
            f"'{matched_phrase}'. Recommend activating competitive battlecard."
        )

        res = await _upsert_detected_signal(
            db,
            signal_id="competitor_signal",
            opportunity_id=opp_id,
            company_id=act.company_id,
            person_id=act.person_id,
            activity_id=act.id,
            title=title,
            summary=summary,
            severity="high",
            score=Decimal("85.00"),
            metadata_payload={
                "matched_phrase": matched_phrase,
                "activity_occurred_at": act.occurred_at.isoformat(),
            },
        )
        results.append(res)

    return results


async def evaluate_all_signals(db: AsyncSession) -> dict[str, Any]:
    """
    Master orchestrator running detection rules across all 6 catalog signals.
    """
    await ensure_signals_dimension(db)
    now = utc_now()

    dormant = await detect_dormant_strategic_accounts(db, now)
    unanswered = await detect_unanswered_conversations(db, now)
    contracts = await detect_expiring_contracts(db, now)
    leadership = await detect_leadership_changes(db, now)
    growth = await detect_hiring_funding_events(db, now)
    competitors = await detect_competitor_signals(db, now)

    all_pairs = dormant + unanswered + contracts + leadership + growth + competitors
    await db.commit()

    by_signal: dict[str, int] = {}
    new_count = 0
    refreshed_count = 0

    for sig, is_new in all_pairs:
        by_signal[sig.signal_id] = by_signal.get(sig.signal_id, 0) + 1
        if is_new:
            new_count += 1
        else:
            refreshed_count += 1

    # Total active signals in database
    total_active = (
        await db.scalar(
            select(func.count(DetectedSignal.id)).where(DetectedSignal.status == "active")
        )
        or 0
    )

    return {
        "status": "success",
        "evaluated_at": now,
        "total_active_signals": total_active,
        "new_signals_detected": new_count,
        "refreshed_signals": refreshed_count,
        "by_signal": by_signal,
    }
