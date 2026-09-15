import datetime
import re
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.base import utc_now
from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.opportunity import Opportunity, OpportunityCompany
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.signal import DetectedSignal, DetectedSignalPerson
from cdb.services.signals.catalog import ensure_signals_dimension
from cdb.services.signals.classification import (
    assess_confidence,
    build_evidence_payload,
    detect_signal_conflicts,
)

# Commercial opportunity / gig regex for filtering unanswered conversations
COMMERCIAL_OPPORTUNITY_REGEX = re.compile(
    r"\b("
    r"proposal|sow|statement of work|contract|scope|scope of work|project scope|"
    r"budget|pricing|rate card|hourly rate|daily rate|fixed price|retainer|"
    r"deliverable|deliverables|consulting|advisory|"
    r"pilot|pilot project|proof of concept|poc|kickoff|kick-off|contract renewal|"
    r"hire you|hire us|work together|partner with us|collaborate on|"
    r"need your help|need help with|looking for an expert|looking for assistance|"
    r"provide a quote|cost estimate|commercial terms|master service agreement|msa"
    r")\b",
    re.IGNORECASE,
)

# Keyword regexes
FUNDING_REGEX = re.compile(
    r"\b(seed|series\s+[abcde]|funding round|raised\s+[\$€£]?\d+|venture round|new capital|investment round)\b",
    re.IGNORECASE,
)
HIRING_REGEX = re.compile(
    r"\b("
    r"(?:hiring|recruiting|looking\s+for|expanding|seeking|onboarding)\s+(?:a\s+|an\s+|the\s+)?(?:data\s+engineer|analytics\s+engineer|lead\s+architect|data\s+lead)|"
    r"hiring\s+data|scaling\s+the\s+team|growing\s+the\s+team|headcount\s+growth|hiring\s+\d+\s+engineers|"
    r"(?:open|new)\s+(?:position|role|opening)s?\s+for\s+(?:data\s+engineer|analytics\s+engineer)"
    r")\b",
    re.IGNORECASE,
)
COMPETITOR_REGEX = re.compile(
    r"\b("
    r"talking to another (?:consultancy|agency|firm|vendor|provider|team)|"
    r"evaluating (?:alternatives?|other options?|competitors?|other firms?|other agencies)|"
    r"considering another (?:consultancy|agency|firm|vendor|provider)|"
    r"competing proposal|competitive proposal|vendor bake-off|competitive bake-off|bake-off|bakeoff|"
    r"competitive rfp|rfp bake-off|comparing proposals?|"
    r"cheaper alternative|lower price from|"
    r"lost to (?:a )?competitor|competitor won|competitor chosen|"
    r"evaluating (?:slalom|thoughtworks|accenture|deloitte|mckinsey|bcg|bain)|"
    r"talking to (?:slalom|thoughtworks|accenture|deloitte|mckinsey|bcg|bain)|"
    r"slalom|thoughtworks|accenture|deloitte"
    r")\b",
    re.IGNORECASE,
)
EXECUTIVE_TITLE_REGEX = re.compile(
    r"\b(chief|cto|cio|cdo|vp|vice president|head of data|head of engineering|director of data|director)\b",
    re.IGNORECASE,
)


async def _resolve_account_for_signal(
    db: AsyncSession,
    company_id: Any | None = None,
    person_id: Any | None = None,
    opportunity_id: Any | None = None,
    engagement_id: Any | None = None,
    activity_id: Any | None = None,
) -> Any | None:
    """
    Resolves the affected account (Company ID) for any detected signal,
    guaranteeing account attribution by traversing relationships.
    """
    if company_id:
        return company_id

    if engagement_id:
        eng = await db.get(Engagement, engagement_id)
        if eng and eng.company_id:
            return eng.company_id
        if eng and eng.opportunity_id:
            opp_comp_stmt = (
                select(OpportunityCompany.company_id)
                .where(OpportunityCompany.opportunity_id == eng.opportunity_id)
                .limit(1)
            )
            c_id = (await db.execute(opp_comp_stmt)).scalars().first()
            if c_id:
                return c_id

    if opportunity_id:
        opp_comp_stmt = (
            select(OpportunityCompany.company_id)
            .where(OpportunityCompany.opportunity_id == opportunity_id)
            .limit(1)
        )
        c_id = (await db.execute(opp_comp_stmt)).scalars().first()
        if c_id:
            return c_id

    if activity_id:
        act = await db.get(Activity, activity_id)
        if act:
            if act.company_id:
                return act.company_id
            if act.engagement_id:
                eng = await db.get(Engagement, act.engagement_id)
                if eng and eng.company_id:
                    return eng.company_id
            if act.person_id and not person_id:
                person_id = act.person_id

    if person_id:
        # Check active current employment first
        rel_stmt = (
            select(PersonCompanyRelationship)
            .where(
                PersonCompanyRelationship.person_id == person_id,
                PersonCompanyRelationship.is_current.is_(True),
            )
            .order_by(PersonCompanyRelationship.started_at.desc().nullslast())
            .limit(1)
        )
        rel = (await db.execute(rel_stmt)).scalars().first()
        if rel and rel.company_id:
            return rel.company_id

        # Fallback to any past relationship
        past_rel_stmt = (
            select(PersonCompanyRelationship)
            .where(PersonCompanyRelationship.person_id == person_id)
            .order_by(PersonCompanyRelationship.ended_at.desc().nullslast())
            .limit(1)
        )
        past_rel = (await db.execute(past_rel_stmt)).scalars().first()
        if past_rel and past_rel.company_id:
            return past_rel.company_id

    return None


async def _upsert_detected_signal(
    db: AsyncSession,
    signal_id: str,
    title: str,
    severity: str,
    summary: str | None = None,
    company_id: Any | None = None,
    person_id: Any | None = None,
    connected_person_ids: list[Any] | None = None,
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
    Guarantees account resolution by populating company_id and company context.
    Returns (signal_instance, is_new).
    """
    metadata_payload = metadata_payload or {}

    # Guarantee affected account attribution
    if not company_id:
        company_id = await _resolve_account_for_signal(
            db,
            company_id=company_id,
            person_id=person_id,
            opportunity_id=opportunity_id,
            engagement_id=engagement_id,
            activity_id=activity_id,
        )

    # Attach rich account supporting context if company_id is present
    if company_id:
        company = await db.get(Company, company_id)
        if company:
            metadata_payload.setdefault("company_name", company.name)
            if company.attributes:
                tier = company.attributes.get("tier")
                segment = company.attributes.get("segment")
                if tier:
                    metadata_payload.setdefault("company_tier", tier)
                if segment:
                    metadata_payload.setdefault("company_segment", segment)
            if "evidence" in metadata_payload and isinstance(metadata_payload["evidence"], dict):
                metadata_payload["evidence"].setdefault("account_name", company.name)

    # Protect against attributing client signals to internal employees/host
    person_roles: dict[str, str] = dict(metadata_payload.get("person_roles") or {})
    if person_id:
        target_person = await db.get(Person, person_id)
        if target_person and target_person.is_internal:
            # Swap with first non-internal connected person if available
            replacement_id = None
            for cpid in connected_person_ids or []:
                if cpid != person_id:
                    cp = await db.get(Person, cpid)
                    if cp and not cp.is_internal:
                        replacement_id = cp.id
                        break
            person_id = replacement_id

    # Filter internal employees out of primary target_person_ids for client opportunity/risk signals
    clean_target_ids: list[Any] = []
    for pid in connected_person_ids or []:
        if not pid:
            continue
        p_rec = await db.get(Person, pid)
        if p_rec and not p_rec.is_internal:
            if pid not in clean_target_ids:
                clean_target_ids.append(pid)

    if person_id and person_id not in clean_target_ids:
        clean_target_ids.insert(0, person_id)

    stmt = select(DetectedSignal).where(
        DetectedSignal.signal_id == signal_id,
        DetectedSignal.status.in_(["active", "acknowledged"]),
    )

    if person_id and signal_id in ("unanswered_conversation", "leadership_change"):
        stmt = stmt.where(DetectedSignal.person_id == person_id)
        if company_id:
            stmt = stmt.where(
                or_(DetectedSignal.company_id == company_id, DetectedSignal.company_id.is_(None))
            )
    elif engagement_id:
        stmt = stmt.where(DetectedSignal.engagement_id == engagement_id)
    elif opportunity_id:
        stmt = stmt.where(DetectedSignal.opportunity_id == opportunity_id)
    elif company_id:
        stmt = stmt.where(DetectedSignal.company_id == company_id)
    elif activity_id:
        stmt = stmt.where(DetectedSignal.activity_id == activity_id)
    elif person_id:
        stmt = stmt.where(DetectedSignal.person_id == person_id)

    existing = (await db.execute(stmt)).scalars().first()
    now = utc_now()

    if existing:
        existing.title = title
        existing.summary = summary
        existing.severity = severity
        existing.score = score or existing.score
        existing.company_id = company_id or existing.company_id
        # If person_id was resolved to None (e.g. internal host filtered out and no external counterparty),
        # clear stale person_id rather than retaining legacy internal employee id
        existing.person_id = person_id
        existing.opportunity_id = opportunity_id or existing.opportunity_id
        existing.engagement_id = engagement_id or existing.engagement_id
        existing.metadata_payload = metadata_payload or {}
        existing.activity_id = activity_id or existing.activity_id
        existing.detected_at = now
        existing.updated_at = now
        if expires_at:
            existing.expires_at = expires_at
        target_sig = existing
        is_new = False
    else:
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
        await db.flush()
        target_sig = new_sig
        is_new = True

    # Link all connected non-internal persons
    for pid in clean_target_ids:
        link_stmt = select(DetectedSignalPerson).where(
            DetectedSignalPerson.detected_signal_id == target_sig.id,
            DetectedSignalPerson.person_id == pid,
        )
        existing_link = (await db.execute(link_stmt)).scalar_one_or_none()
        assigned_role = person_roles.get(str(pid)) or (
            "primary" if pid == person_id else "participant"
        )
        if not existing_link:
            db.add(
                DetectedSignalPerson(
                    detected_signal_id=target_sig.id,
                    person_id=pid,
                    role=assigned_role,
                )
            )
        elif existing_link.role != assigned_role and assigned_role != "participant":
            existing_link.role = assigned_role

    return target_sig, is_new


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
        confidence_val = Decimal("0.90") if last_act else Decimal("0.70")
        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(confidence_val)

        evidence = build_evidence_payload(
            evidence_type="temporal_inactivity",
            source_entity_type="company",
            source_entity_id=str(comp.id),
            occurred_at=(
                last_act.occurred_at.isoformat() if last_act and last_act.occurred_at else None
            ),
            days_elapsed=days_inactive,
            excerpt=f"No touchpoints recorded for {days_inactive} days on strategic account '{comp.name}'",
            key_metrics={
                "days_inactive": days_inactive,
                "threshold_days": 60 if severity == "high" else 90,
            },
            verification_status="verified" if last_act else "probable",
        )

        title = f"Dormant Strategic Account: {comp.name} ({days_inactive}d inactive)"
        summary = (
            f"Strategic account '{comp.name}' has had no recorded meetings, calls, or communications "
            f"for {days_inactive} days. Proactive re-engagement recommended."
        )

        meta = {
            "days_inactive": days_inactive,
            "company_name": comp.name,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
        }

        res = await _upsert_detected_signal(
            db,
            signal_id="dormant_strategic_account",
            company_id=comp.id,
            activity_id=last_act.id if last_act else None,
            title=title,
            summary=summary,
            severity=severity,
            score=conf_score,
            metadata_payload=meta,
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

        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(Decimal("0.95"))
        evidence = build_evidence_payload(
            evidence_type="contract_milestone",
            source_entity_type="engagement",
            source_entity_id=str(eng.id),
            occurred_at=eng.expected_end_date.isoformat(),
            days_elapsed=days_left,
            excerpt=f"Engagement '{eng.title}' expected end date is {eng.expected_end_date.isoformat()}",
            key_metrics={
                "days_left": days_left,
                "expected_end_date": eng.expected_end_date.isoformat(),
                "rate_type": eng.rate_type,
                "currency": eng.currency,
                "rate_value": float(eng.rate_value) if eng.rate_value else None,
            },
            verification_status="verified",
        )

        status_label = f"{days_left}d remaining" if days_left >= 0 else f"{-days_left}d overdue"
        title = f"Expiring Contract: {eng.title} ({status_label})"
        summary = (
            f"Engagement '{eng.title}' ends on {eng.expected_end_date.isoformat()} ({status_label}). "
            f"Contract status is '{eng.contract_status}'. Immediate renewal or extension review required."
        )

        meta = {
            "days_left": days_left,
            "expected_end_date": eng.expected_end_date.isoformat(),
            "rate_type": eng.rate_type,
            "currency": eng.currency,
            "rate_value": float(eng.rate_value) if eng.rate_value else None,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
        }

        res = await _upsert_detected_signal(
            db,
            signal_id="expiring_contract",
            engagement_id=eng.id,
            company_id=eng.company_id,
            opportunity_id=eng.opportunity_id,
            title=title,
            summary=summary,
            severity=severity,
            score=conf_score,
            metadata_payload=meta,
        )
        results.append(res)

    return results


async def detect_unanswered_conversations(
    db: AsyncSession, now: datetime.datetime, lookback_days: int = 90
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects inbound messages or communications awaiting outbound response for > 3 days.
    Filters out routine inbox noise by strictly requiring either:
    1. Competitor mentions / alternative evaluations, OR
    2. Commercial intent / gig or project opportunities.
    """
    cutoff_3d = now - datetime.timedelta(days=3)
    cutoff_7d = now - datetime.timedelta(days=7)
    lookback_cutoff = now - datetime.timedelta(days=lookback_days)

    # Inspect activities of type conversation, message, linkedin_message, email, whatsapp within lookback window
    stmt = (
        select(Activity)
        .where(
            Activity.type.in_(["conversation", "message", "linkedin_message", "email", "whatsapp"]),
            Activity.person_id.is_not(None),
            Activity.occurred_at <= cutoff_3d,
            Activity.occurred_at >= lookback_cutoff,
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

        # Check conversation content for competitor context or commercial gig/project intent
        content = f"{act.title or ''} {act.summary or ''} {act.raw_content or ''}"
        comp_match = COMPETITOR_REGEX.search(content)
        opp_match = COMMERCIAL_OPPORTUNITY_REGEX.search(content)

        if not (comp_match or opp_match):
            # As per requirements, unanswered conversations without competitor context
            # or potential commercial opportunity / gig are routine inbox noise and ignored.
            continue

        person = await db.get(Person, person_id)
        person_name = f"{person.first_name} {person.last_name}" if person else "Contact"

        # Resolve affected account
        comp_id = await _resolve_account_for_signal(
            db,
            company_id=act.company_id,
            person_id=person_id,
            activity_id=act.id,
        )
        comp = await db.get(Company, comp_id) if comp_id else None
        comp_name = comp.name if comp else None

        if comp_match:
            matched_term = comp_match.group(0)
            severity = "critical" if act_dt <= cutoff_7d else "high"
            title = f"Unanswered Thread (Competitor Mention): {person_name} ({days_unanswered}d waiting)"
            summary = (
                f"Inbound conversation from {person_name} received on {act.occurred_at.strftime('%Y-%m-%d')} "
                f"({days_unanswered} days ago) referenced competitor/bake-off ('{matched_term}') and is awaiting response."
            )
            context_type = "competitor_risk"
            excerpt = f"Competitor context '{matched_term}' in conversation with {person_name}"
        else:
            matched_term = opp_match.group(0) if opp_match else "project/gig"
            severity = "high" if act_dt <= cutoff_7d else "medium"
            title = f"Unanswered Opportunity / Gig Lead: {person_name} ({days_unanswered}d waiting)"
            summary = (
                f"Inbound conversation from {person_name} received on {act.occurred_at.strftime('%Y-%m-%d')} "
                f"({days_unanswered} days ago) discussed a commercial opportunity/gig ('{matched_term}') and has no recorded reply."
            )
            context_type = "commercial_opportunity"
            excerpt = f"Opportunity context '{matched_term}' in conversation with {person_name}"

        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(Decimal("0.90"))

        evidence = build_evidence_payload(
            evidence_type="message_sla",
            source_entity_type="activity",
            source_entity_id=str(act.id),
            occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
            days_elapsed=days_unanswered,
            excerpt=excerpt,
            key_metrics={
                "days_unanswered": days_unanswered,
                "channel": act.type,
                "account_name": comp_name,
                "matched_phrase": matched_term,
                "context_type": context_type,
            },
            verification_status="verified",
        )

        meta = {
            "days_unanswered": days_unanswered,
            "channel": act.type,
            "message_occurred_at": act.occurred_at.isoformat() if act.occurred_at else None,
            "person_name": person_name,
            "company_name": comp_name,
            "matched_phrase": matched_term,
            "context_type": context_type,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
        }

        res = await _upsert_detected_signal(
            db,
            signal_id="unanswered_conversation",
            person_id=person_id,
            company_id=comp_id,
            activity_id=act.id,
            title=title,
            summary=summary,
            severity=severity,
            score=conf_score,
            metadata_payload=meta,
        )
        results.append(res)

    return results


async def detect_leadership_changes(
    db: AsyncSession, now: datetime.datetime, lookback_days: int = 90
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects executive departures or new executive roles within the lookback window.
    """
    cutoff_date = (now - datetime.timedelta(days=lookback_days)).date()

    # 1. Departures (ended_at >= cutoff_date or is_current=False with ended_at)
    dep_stmt = (
        select(PersonCompanyRelationship)
        .where(
            PersonCompanyRelationship.is_current.is_(False),
            PersonCompanyRelationship.ended_at >= cutoff_date,
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

        conf_val = Decimal("0.85") if rel.ended_at else Decimal("0.65")
        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(conf_val)

        evidence = build_evidence_payload(
            evidence_type="relationship_transition",
            source_entity_type="relationship",
            source_entity_id=str(rel.id),
            occurred_at=rel.ended_at.isoformat() if rel.ended_at else None,
            days_elapsed=(now.date() - rel.ended_at).days if rel.ended_at else None,
            excerpt=f"{person_name} departed former role '{rel.title or 'Stakeholder'}' at {comp_name}",
            key_metrics={"event_type": "departure", "role": rel.title},
            verification_status="verified" if rel.ended_at else "probable",
        )

        title = f"Leadership Departure: {person_name} left {comp_name}"
        summary = (
            f"{person_name} transitioned away from {comp_name} (former role: {rel.title or 'Stakeholder'}). "
            "Opportunity to congratulate and explore relationships at their new destination."
        )

        meta = {
            "event_type": "departure",
            "role": rel.title,
            "ended_at": rel.ended_at.isoformat() if rel.ended_at else None,
            "company_name": comp_name,
            "person_name": person_name,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
        }

        res = await _upsert_detected_signal(
            db,
            signal_id="leadership_change",
            person_id=rel.person_id,
            company_id=rel.company_id,
            title=title,
            summary=summary,
            severity="high",
            score=conf_score,
            metadata_payload=meta,
        )
        results.append(res)

    # 2. New Executive arrivals (started_at >= cutoff_date, title matching executive regex)
    arr_stmt = (
        select(PersonCompanyRelationship)
        .where(
            PersonCompanyRelationship.is_current.is_(True),
            PersonCompanyRelationship.started_at >= cutoff_date,
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

        conf_val = Decimal("0.85") if rel.started_at else Decimal("0.65")
        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(conf_val)

        evidence = build_evidence_payload(
            evidence_type="relationship_transition",
            source_entity_type="relationship",
            source_entity_id=str(rel.id),
            occurred_at=rel.started_at.isoformat() if rel.started_at else None,
            days_elapsed=(now.date() - rel.started_at).days if rel.started_at else None,
            excerpt=f"{person_name} joined {comp_name} as {rel.title}",
            key_metrics={"event_type": "new_hire", "role": rel.title},
            verification_status="verified" if rel.started_at else "probable",
        )

        title = f"New Executive Leader: {person_name} ({rel.title}) at {comp_name}"
        summary = (
            f"{person_name} recently joined {comp_name} as {rel.title}. "
            "Fresh leadership mandates often unlock new data, AI, or advisory budgets."
        )

        meta = {
            "event_type": "new_hire",
            "role": rel.title,
            "started_at": rel.started_at.isoformat() if rel.started_at else None,
            "company_name": comp_name,
            "person_name": person_name,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
        }

        res = await _upsert_detected_signal(
            db,
            signal_id="leadership_change",
            person_id=rel.person_id,
            company_id=rel.company_id,
            title=title,
            summary=summary,
            severity="high",
            score=conf_score,
            metadata_payload=meta,
        )
        results.append(res)

    return results


async def detect_hiring_funding_events(
    db: AsyncSession, now: datetime.datetime, lookback_days: int = 90
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects mentions of funding rounds or hiring acceleration across:
    1. Unstructured interactions and meeting debriefs (Activity records within lookback window).
    2. Structured account enrichment data (Company.attributes funding and headcount signals).
    """
    cutoff = now - datetime.timedelta(days=lookback_days)

    results: list[tuple[DetectedSignal, bool]] = []
    seen_companies: set[Any] = set()

    # 1. Activity Data Evaluation (Text Patterns)
    stmt = (
        select(Activity)
        .where(
            Activity.occurred_at >= cutoff,
            Activity.company_id.is_not(None),
        )
        .order_by(Activity.occurred_at.desc())
    )
    activities = (await db.execute(stmt)).scalars().all()

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

        # Confidence assessment based on phrase type and recency
        act_dt = (
            act.occurred_at
            if act.occurred_at.tzinfo
            else act.occurred_at.replace(tzinfo=datetime.UTC)
        )
        days_ago = (now - act_dt).days
        conf_val = Decimal("0.80") if funding_match else Decimal("0.65")
        flags: list[str] = []
        if days_ago > 60:
            conf_val -= Decimal("0.20")
            flags.append(f"Event occurred {days_ago} days ago; growth context may have evolved")

        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(
            conf_val, ambiguity_flags=flags
        )

        evidence = build_evidence_payload(
            evidence_type="text_pattern",
            source_entity_type="activity",
            source_entity_id=str(act.id),
            occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
            days_elapsed=days_ago,
            excerpt=f"Matched '{matched_phrase}' in activity: {act.title or act.summary or ''}",
            key_metrics={
                "event_type": event_type.lower(),
                "matched_phrase": matched_phrase,
                "account_name": comp_name,
            },
            verification_status="verified" if not is_uncertain else "probable",
        )

        title = f"{event_type} Signal: {comp_name} ('{matched_phrase}')"
        summary = (
            f"Interaction on {act.occurred_at.strftime('%Y-%m-%d')} highlighted a growth/capital event: "
            f"'{matched_phrase}'. Potential advisory or capability acceleration opportunity."
        )

        # Extract connected persons, roles, and suggested persons from activity
        connected_pids: list[Any] = []
        person_roles: dict[str, str] = {}
        act_attrs = act.attributes or {}
        act_entities = act_attrs.get("entities", [])
        act_suggested = act_attrs.get("suggested_persons", [])

        for e in act_entities:
            epid = e.get("person_id")
            erole = e.get("role") or "counterparty"
            if epid and not e.get("is_internal"):
                try:
                    uuid_val = uuid.UUID(epid) if isinstance(epid, str) else epid
                    if uuid_val not in connected_pids:
                        connected_pids.append(uuid_val)
                    person_roles[str(uuid_val)] = erole
                except Exception:
                    pass

        if act.person_id and act.person_id not in connected_pids:
            p_obj = await db.get(Person, act.person_id)
            if p_obj and not p_obj.is_internal:
                connected_pids.insert(0, act.person_id)

        meta = {
            "event_type": event_type.lower(),
            "matched_phrase": matched_phrase,
            "activity_date": act.occurred_at.isoformat() if act.occurred_at else None,
            "company_name": comp_name,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
            "person_roles": person_roles,
            "suggested_persons": act_suggested,
        }

        res = await _upsert_detected_signal(
            db,
            signal_id="hiring_funding_event",
            company_id=act.company_id,
            person_id=act.person_id,
            connected_person_ids=connected_pids,
            activity_id=act.id,
            title=title,
            summary=summary,
            severity="medium",
            score=conf_score,
            metadata_payload=meta,
        )
        results.append(res)

    # 2. Enrichment Data Evaluation (Company.attributes)
    companies_stmt = select(Company).where(Company.deleted_at.is_(None))
    all_companies = (await db.execute(companies_stmt)).scalars().all()

    for comp in all_companies:
        if comp.id in seen_companies or not comp.attributes:
            continue

        attrs = comp.attributes
        # A. Funding enrichment signals
        funding_data = (
            attrs.get("funding") or attrs.get("funding_round") or attrs.get("recent_funding_round")
        )
        stage_data = attrs.get("funding_stage") or attrs.get("stage")
        total_funding = attrs.get("total_funding") or attrs.get("total_raised")

        round_name = None
        amount = None
        date_str = None

        if isinstance(funding_data, dict):
            round_name = (
                funding_data.get("round") or funding_data.get("stage") or funding_data.get("name")
            )
            amount = funding_data.get("amount") or funding_data.get("total_raised")
            date_str = funding_data.get("announced_date") or funding_data.get("date")
        elif isinstance(funding_data, str) and funding_data:
            round_name = funding_data
        elif stage_data:
            round_name = str(stage_data)

        if total_funding and not amount:
            amount = str(total_funding)

        if round_name or (amount and "seed" in str(amount).lower()):
            seen_companies.add(comp.id)
            round_label = round_name or "Capital Investment"
            amount_label = f" ({amount})" if amount else ""
            severity = (
                "high"
                if any(
                    x in str(round_label).lower()
                    for x in ["series b", "series c", "series d", "growth"]
                )
                else "medium"
            )

            conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(Decimal("0.90"))

            evidence = build_evidence_payload(
                evidence_type="enrichment_data",
                source_entity_type="company",
                source_entity_id=str(comp.id),
                occurred_at=date_str or now.isoformat(),
                days_elapsed=0,
                excerpt=f"Company enrichment attribute indicates {round_label}{amount_label}",
                key_metrics={
                    "enrichment_source": "company_attributes",
                    "event_type": "funding",
                    "round": round_label,
                    "amount": amount,
                    "account_name": comp.name,
                },
                verification_status="verified",
            )

            title = f"Funding Event: {comp.name} ({round_label})"
            summary = (
                f"Enrichment data indicates {comp.name} secured {round_label}{amount_label}. "
                "Fresh investment accelerates tech execution and advisory needs."
            )

            meta = {
                "event_type": "funding",
                "round": round_label,
                "amount": amount,
                "enrichment_source": "company_attributes",
                "company_name": comp.name,
                "confidence_score": float(conf_score),
                "confidence_tier": conf_tier.value,
                "is_uncertain": is_uncertain,
                "uncertainty_reasons": uncert_reasons,
                "evidence": evidence,
            }

            res = await _upsert_detected_signal(
                db,
                signal_id="hiring_funding_event",
                company_id=comp.id,
                title=title,
                summary=summary,
                severity=severity,
                score=conf_score,
                metadata_payload=meta,
            )
            results.append(res)
            continue

        # B. Headcount expansion & hiring enrichment signals
        headcount_data = (
            attrs.get("headcount") or attrs.get("headcount_growth") or attrs.get("hiring_signals")
        )
        growth_rate = None
        openings = None

        if isinstance(headcount_data, dict):
            growth_rate = (
                headcount_data.get("growth_rate_pct")
                or headcount_data.get("growth_pct")
                or headcount_data.get("growth_rate")
            )
            openings = (
                headcount_data.get("open_roles")
                or headcount_data.get("engineering_openings")
                or headcount_data.get("openings")
            )
        elif isinstance(headcount_data, (int, float)):
            growth_rate = headcount_data
        elif isinstance(headcount_data, str) and "%" in headcount_data:
            growth_rate = headcount_data

        if growth_rate or openings or attrs.get("is_hiring_data"):
            seen_companies.add(comp.id)
            growth_desc = (
                f"+{growth_rate}% growth"
                if growth_rate
                else (f"{openings} open positions" if openings else "Aggressive team expansion")
            )
            conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(Decimal("0.85"))

            evidence = build_evidence_payload(
                evidence_type="enrichment_data",
                source_entity_type="company",
                source_entity_id=str(comp.id),
                occurred_at=now.isoformat(),
                days_elapsed=0,
                excerpt=f"Company enrichment attributes reflect team scaling: {growth_desc}",
                key_metrics={
                    "enrichment_source": "company_attributes",
                    "event_type": "hiring_expansion",
                    "growth_description": growth_desc,
                    "account_name": comp.name,
                },
                verification_status="verified",
            )

            title = f"Hiring Expansion: {comp.name} ({growth_desc})"
            summary = (
                f"Enrichment data indicates {comp.name} is scaling headcount ({growth_desc}). "
                "Capacity constraints make external advisory and delivery sprint support highly attractive."
            )

            meta = {
                "event_type": "hiring_expansion",
                "growth_description": growth_desc,
                "enrichment_source": "company_attributes",
                "company_name": comp.name,
                "confidence_score": float(conf_score),
                "confidence_tier": conf_tier.value,
                "is_uncertain": is_uncertain,
                "uncertainty_reasons": uncert_reasons,
                "evidence": evidence,
            }

            res = await _upsert_detected_signal(
                db,
                signal_id="hiring_funding_event",
                company_id=comp.id,
                title=title,
                summary=summary,
                severity="medium",
                score=conf_score,
                metadata_payload=meta,
            )
            results.append(res)

    return results


async def detect_competitor_signals(
    db: AsyncSession, now: datetime.datetime, lookback_days: int = 90
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects competitor mentions or bake-offs in recent meeting debriefs or deal notes.
    Guarantees affected account resolution via Opportunity, Engagement, or Person.
    """
    cutoff = now - datetime.timedelta(days=lookback_days)

    stmt = (
        select(Activity).where(Activity.occurred_at >= cutoff).order_by(Activity.occurred_at.desc())
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

        # Resolve affected company
        resolved_comp_id = await _resolve_account_for_signal(
            db,
            company_id=act.company_id,
            opportunity_id=opp_id,
            engagement_id=act.engagement_id,
            person_id=act.person_id,
            activity_id=act.id,
        )

        target_key = opp_id or resolved_comp_id or act.person_id
        if target_key in seen_opps:
            continue
        seen_opps.add(target_key)

        matched_lower = matched_phrase.lower()
        named_consultancies = {
            "slalom",
            "thoughtworks",
            "accenture",
            "deloitte",
            "competing proposal",
            "bake-off",
            "rfp",
        }
        is_named = any(name in matched_lower for name in named_consultancies)

        act_dt = (
            act.occurred_at
            if act.occurred_at.tzinfo
            else act.occurred_at.replace(tzinfo=datetime.UTC)
        )
        days_ago = (now - act_dt).days
        conf_val = Decimal("0.85") if is_named else Decimal("0.60")
        flags: list[str] = []
        if days_ago > 60:
            conf_val -= Decimal("0.15")
            flags.append(
                f"Mention occurred {days_ago} days ago; competitor evaluation may have concluded"
            )

        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(
            conf_val, ambiguity_flags=flags
        )

        evidence = build_evidence_payload(
            evidence_type="text_pattern",
            source_entity_type="activity",
            source_entity_id=str(act.id),
            occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
            days_elapsed=days_ago,
            excerpt=f"Competitor phrase '{matched_phrase}' detected in interaction: {act.title or act.summary or ''}",
            key_metrics={"matched_phrase": matched_phrase, "is_named_competitor": is_named},
            verification_status="verified" if is_named else "probable",
        )

        title = f"Competitor Threat: '{matched_phrase}' detected"
        summary = (
            f"Interaction on {act.occurred_at.strftime('%Y-%m-%d')} indicated competitor or alternative evaluation: "
            f"'{matched_phrase}'. Recommend activating competitive battlecard."
        )

        meta = {
            "matched_phrase": matched_phrase,
            "activity_occurred_at": act.occurred_at.isoformat() if act.occurred_at else None,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
        }

        connected_pids: list[Any] = []
        if act.person_id:
            connected_pids.append(act.person_id)
        if act.attributes and isinstance(act.attributes, dict):
            for extra_pid in act.attributes.get("participant_person_ids", []):
                if extra_pid not in connected_pids:
                    connected_pids.append(extra_pid)
            for e in act.attributes.get("entities", []):
                epid = e.get("person_id")
                if epid and not e.get("is_internal"):
                    try:
                        uuid_val = uuid.UUID(epid) if isinstance(epid, str) else epid
                        if uuid_val not in connected_pids:
                            connected_pids.append(uuid_val)
                    except Exception:
                        pass
            if act.attributes.get("suggested_persons"):
                meta["suggested_persons"] = act.attributes.get("suggested_persons")

        res = await _upsert_detected_signal(
            db,
            signal_id="competitor_signal",
            opportunity_id=opp_id,
            company_id=resolved_comp_id,
            person_id=act.person_id,
            connected_person_ids=connected_pids,
            activity_id=act.id,
            title=title,
            summary=summary,
            severity="high",
            score=conf_score,
            metadata_payload=meta,
        )
        results.append(res)

    return results


async def evaluate_all_signals(db: AsyncSession, lookback_days: int = 90) -> dict[str, Any]:
    """
    Master orchestrator running detection rules across all 6 catalog signals
    within the configured lookback window (default: 90 days; up to 730 days / 2 years),
    followed by retiring outdated signals and evaluating multi-entity conflicts.
    """
    lookback_days = max(1, min(730, lookback_days))
    await ensure_signals_dimension(db)
    now = utc_now()

    dormant = await detect_dormant_strategic_accounts(db, now)
    unanswered = await detect_unanswered_conversations(db, now, lookback_days=lookback_days)
    contracts = await detect_expiring_contracts(db, now)
    leadership = await detect_leadership_changes(db, now, lookback_days=lookback_days)
    growth = await detect_hiring_funding_events(db, now, lookback_days=lookback_days)
    competitors = await detect_competitor_signals(db, now, lookback_days=lookback_days)

    all_pairs = dormant + unanswered + contracts + leadership + growth + competitors
    await db.flush()

    # Automatically retire/dismiss active signals for managed catalog signals that were not detected
    # in this run (e.g. outside the selected lookback window or criteria no longer met)
    managed_signal_ids = [
        "dormant_strategic_account",
        "unanswered_conversation",
        "expiring_contract",
        "leadership_change",
        "hiring_funding_event",
        "competitor_signal",
    ]
    detected_ids = {sig.id for sig, _ in all_pairs}
    stale_stmt = select(DetectedSignal).where(
        DetectedSignal.status == "active",
        DetectedSignal.signal_id.in_(managed_signal_ids),
        DetectedSignal.id.not_in(detected_ids),
    )
    stale_signals = (await db.execute(stale_stmt)).scalars().all()
    for stale_sig in stale_signals:
        stale_sig.status = "dismissed"
        meta = dict(stale_sig.metadata_payload or {})
        meta["auto_retired"] = True
        meta["retired_reason"] = (
            f"Outside {lookback_days}d lookback window or criteria no longer met"
        )
        stale_sig.metadata_payload = meta
        stale_sig.updated_at = now

    await db.flush()

    # Query all active/acknowledged signals to evaluate multi-entity conflicts
    active_signals_stmt = select(DetectedSignal).where(
        DetectedSignal.status.in_(["active", "acknowledged"])
    )
    active_signals = (await db.execute(active_signals_stmt)).scalars().all()

    # Detect conflicts across Company, Opportunity, and Person scopes
    conflict_map = detect_signal_conflicts(list(active_signals))

    total_conflicting = 0
    total_uncertain = 0

    for sig in active_signals:
        sig_id_str = str(sig.id)
        c_info = conflict_map.get(sig_id_str, {})
        meta = dict(sig.metadata_payload or {})

        meta["has_conflict"] = c_info.get("has_conflict", False)
        meta["conflicting_signal_ids"] = c_info.get("conflicting_signal_ids", [])
        meta["conflict_summary"] = c_info.get("conflict_summary")
        meta["conflict_scope"] = c_info.get("conflict_scope")

        if meta["has_conflict"]:
            total_conflicting += 1
        if meta.get("is_uncertain", False):
            total_uncertain += 1

        sig.metadata_payload = meta

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

    total_active = len(active_signals)

    return {
        "status": "success",
        "evaluated_at": now,
        "lookback_days": lookback_days,
        "total_active_signals": total_active,
        "total_conflicting": total_conflicting,
        "total_uncertain": total_uncertain,
        "new_signals_detected": new_count,
        "refreshed_signals": refreshed_count,
        "by_signal": by_signal,
    }
