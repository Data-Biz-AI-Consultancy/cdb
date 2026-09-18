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
    determine_evidence_status,
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
    channel_display = (act.type or "message").upper()

    if is_competitor:
        severity = "critical" if days_unanswered >= 7 else "high"
        title = (
            f"Unanswered Thread (Competitor Mention): {person_name} ({days_unanswered}d waiting)"
        )
        summary = (
            f"Inbound conversation from {person_name} received on {act.occurred_at.strftime('%Y-%m-%d')} "
            f"({days_unanswered} days ago) referenced competitor/bake-off ('{matched_term}') and is awaiting response."
        )
        why_it_matters = (
            f"Inbound conversation with competitor or alternative evaluation context ('{matched_term}') "
            f"has been unanswered for {days_unanswered} days. Rapid response is required to protect deal momentum "
            "and prevent competitor pre-emption."
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
        why_it_matters = (
            f"Client conversion probability and trust decline quickly with response latency. "
            f"This commercial inquiry ('{matched_term}') is {days_unanswered} days old and awaiting prompt response."
        )
        context_type = "commercial_opportunity"
        excerpt = f"Opportunity context '{matched_term}' in conversation with {person_name}"

    conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(Decimal("0.90"))

    trigger_title = (
        f"Inbound {channel_display} message from {person_name} unreplied for {days_unanswered} days"
    )

    commercial_ctx = {
        "channel": act.type,
        "matched_phrase": matched_term,
        "context_type": context_type,
        "account_name": comp_name,
        "activity_title": act.title,
    }
    relationship_ctx = {
        "person_name": person_name,
        "account_name": comp_name,
        "is_counterparty_inbound": True,
    }

    evidence_status, evidence_notes = determine_evidence_status(
        days_elapsed=days_unanswered,
        max_fresh_days=14,
        is_uncertain=is_uncertain,
        missing_required=not bool(person_id),
        verification_status="verified",
    )

    evidence = build_evidence_payload(
        evidence_type="message_sla",
        source_entity_type="activity",
        source_entity_id=str(act.id),
        source_display=f"{channel_display} Message: {act.title or 'Inbound Conversation'}",
        trigger_event_title=trigger_title,
        why_it_matters_now=why_it_matters,
        occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
        days_elapsed=days_unanswered,
        excerpt=excerpt,
        evidence_status=evidence_status,
        evidence_notes=evidence_notes,
        commercial_context=commercial_ctx,
        relationship_context=relationship_ctx,
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
        why_it_matters_now=why_it_matters,
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
