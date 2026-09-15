"""
cdb.services.signals.detectors.unanswered.signal

Builds and persists unanswered conversation signals.
"""

from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import (
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
)
from cdb.services.signals.utils import _upsert_detected_signal


async def create_unanswered_signal(
    db: AsyncSession,
    act: Activity,
    person_id: Any,
    comp_id: Any | None,
    person_name: str,
    comp_name: str | None,
    matched_term: str,
    days_unanswered: int,
    is_competitor: bool,
) -> tuple[DetectedSignal, bool]:
    """Helper creating and persisting an unanswered conversation signal."""
    if is_competitor:
        severity = "critical" if days_unanswered >= 7 else "high"
        title = (
            f"Unanswered Thread (Competitor Mention): {person_name} ({days_unanswered}d waiting)"
        )
        summary = (
            f"Inbound conversation from {person_name} received on {act.occurred_at.strftime('%Y-%m-%d')} "
            f"({days_unanswered} days ago) referenced competitor/bake-off ('{matched_term}') and is awaiting response."
        )
        context_type = "competitor_risk"
        excerpt = f"Competitor context '{matched_term}' in conversation with {person_name}"
    else:
        severity = "high" if days_unanswered >= 7 else "medium"
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
    meta = build_signal_meta(
        conf_score,
        conf_tier,
        is_uncertain,
        uncert_reasons,
        evidence,
        days_unanswered=days_unanswered,
        channel=act.type,
        message_occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
        person_name=person_name,
        company_name=comp_name,
        matched_phrase=matched_term,
        context_type=context_type,
    )
    return await _upsert_detected_signal(
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
