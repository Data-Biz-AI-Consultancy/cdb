"""
cdb.services.signals.detectors.unanswered

Detects inbound conversations awaiting a response for > 3 days where the
content signals a competitor mention or a commercial / gig opportunity.

Routine inbox noise (expert-network platforms, recruiter messages) is
explicitly excluded to keep signal quality high.
"""

import datetime
import re
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.person import Person
from cdb.models.signal import DetectedSignal
from cdb.services.signals._helpers import _resolve_account_for_signal, _upsert_detected_signal
from cdb.services.signals.classification import assess_confidence, build_evidence_payload
from cdb.services.signals.patterns import (
    COMMERCIAL_OPPORTUNITY_REGEX,
    COMPETITOR_REGEX,
    EXCLUDE_CONVERSATION_REGEX,
)


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

    # Inspect activities of type conversation, message, linkedin_message, email, whatsapp
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

        # Check if the latest message in this thread was already sent by the host/user
        if act.raw_content:
            lines = [
                line_str.strip() for line_str in act.raw_content.splitlines() if line_str.strip()
            ]
            speaker_re = re.compile(r"^([A-Za-z0-9\s\.\-_]+?):\s*(.*)$")
            last_speaker = None
            for line in reversed(lines):
                m = speaker_re.match(line)
                if m:
                    last_speaker = m.group(1).strip()
                    break
            if last_speaker:
                ls_lower = last_speaker.lower()
                if any(h in ls_lower for h in ["jimmy", "pang", "host", "databiz", "me"]):
                    # Conversation was already replied to by host
                    continue

        # Check conversation content for competitor context or commercial gig/project intent
        content = f"{act.title or ''} {act.summary or ''} {act.raw_content or ''}"
        if EXCLUDE_CONVERSATION_REGEX.search(content):
            continue

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
