"""
cdb.services.signals.detectors.competitors.signal

Builds and persists competitor threat signals.
"""

import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import (
    SourceReliability,
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
    determine_evidence_status,
    evaluate_source_data_quality,
)
from cdb.services.signals.detectors.competitors.constants import NAMED_CONSULTANCIES
from cdb.services.signals.utils import (
    _upsert_detected_signal,
    days_between,
    extract_activity_persons,
)


async def create_competitor_signal(
    db: AsyncSession,
    act: Activity,
    opp_id: Any | None,
    resolved_comp_id: Any | None,
    matched_phrase: str,
    now: datetime.datetime,
) -> tuple[DetectedSignal, bool]:
    """Constructs evidence and metadata payload, then persists a competitor threat signal."""
    matched_lower = matched_phrase.lower()
    is_named = any(name in matched_lower for name in NAMED_CONSULTANCIES)

    days_ago = days_between(act.occurred_at, now)
    raw_conf = Decimal("0.85") if is_named else Decimal("0.60")

    quality_assessment = evaluate_source_data_quality(
        signal_id="competitor_signal",
        days_elapsed=days_ago,
        max_fresh_days=60,
        has_company=bool(resolved_comp_id),
        has_contact_role=True,
        raw_excerpt=f"Competitor phrase '{matched_phrase}' detected in interaction: {act.title or act.summary or ''}",
        confidence_score=raw_conf,
        source_reliability=SourceReliability.HIGH if is_named else SourceReliability.MEDIUM,
    )

    conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(
        raw_conf,
        quality_flags=quality_assessment.data_quality_flags,
        confidence_penalty=quality_assessment.confidence_penalty,
    )
    for note in quality_assessment.disclosure_notes:
        if note not in uncert_reasons:
            uncert_reasons.append(note)

    why_it_matters = (
        f"Competitor or alternative solution evaluation ('{matched_phrase}') in an active deal creates "
        "displacement and pricing pressure. Prompt deployment of competitive differentiation battlecards "
        "and value re-anchoring protects win probability."
    )
    trigger_title = f"Competitor evaluation phrase detected: '{matched_phrase}'"

    commercial_ctx = {
        "matched_phrase": matched_phrase,
        "is_named_competitor": is_named,
        "activity_title": act.title,
    }

    evidence_status, evidence_notes = determine_evidence_status(
        days_elapsed=days_ago,
        max_fresh_days=60,
        is_uncertain=is_uncertain,
        verification_status="verified" if is_named else "probable",
    )

    evidence = build_evidence_payload(
        evidence_type="text_pattern",
        source_entity_type="activity",
        source_entity_id=str(act.id),
        source_display=f"Interaction Note: {act.title or act.type or 'Touchpoint'}",
        trigger_event_title=trigger_title,
        why_it_matters_now=why_it_matters,
        occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
        days_elapsed=days_ago,
        excerpt=quality_assessment.processed_excerpt,
        evidence_status=evidence_status,
        evidence_notes=evidence_notes,
        commercial_context=commercial_ctx,
        key_metrics={"matched_phrase": matched_phrase, "is_named_competitor": is_named},
        verification_status="verified" if is_named else "probable",
        source_reliability=quality_assessment.source_reliability.value,
        data_quality_flags=quality_assessment.data_quality_flags,
        disclosure_notes=quality_assessment.disclosure_notes,
        has_quality_warning=quality_assessment.has_quality_warning,
    )

    title = f"Competitor Threat: '{matched_phrase}' detected"
    summary = (
        f"Interaction on {act.occurred_at.strftime('%Y-%m-%d')} indicated competitor or alternative evaluation: "
        f"'{matched_phrase}'. Recommend activating competitive battlecard."
    )

    connected_pids, _, suggested = extract_activity_persons(act)

    meta = build_signal_meta(
        conf_score,
        conf_tier,
        is_uncertain,
        uncert_reasons,
        evidence,
        matched_phrase=matched_phrase,
        activity_occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
        why_it_matters_now=why_it_matters,
        has_data_quality_warning=quality_assessment.has_quality_warning,
        data_quality_flags=quality_assessment.data_quality_flags,
        source_reliability=quality_assessment.source_reliability.value,
        is_suppressed=quality_assessment.is_suppressed,
    )
    if suggested:
        meta["suggested_persons"] = suggested

    return await _upsert_detected_signal(
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
