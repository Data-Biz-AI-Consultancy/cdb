"""
cdb.services.signals.detectors.dormant.signal

Builds and persists dormant strategic account signals.
"""

from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import (
    SourceReliability,
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
    determine_evidence_status,
    evaluate_source_data_quality,
)
from cdb.services.signals.utils import (
    _upsert_detected_signal,
    get_company_display_name,
)


async def create_dormant_signal(
    db: AsyncSession,
    comp: Company,
    last_act: Activity | None,
    days_inactive: int,
) -> tuple[DetectedSignal, bool]:
    """Constructs metadata, temporal inactivity evidence, and persists a dormant account signal."""
    comp_name = get_company_display_name(comp)
    severity = "critical" if days_inactive >= 90 else "high"
    confidence_val = Decimal("0.90") if last_act else Decimal("0.70")

    quality_assessment = evaluate_source_data_quality(
        signal_id="dormant_strategic_account",
        days_elapsed=days_inactive,
        max_fresh_days=90,
        has_company=bool(comp.id),
        has_contact_role=True,
        confidence_score=confidence_val,
        source_reliability=SourceReliability.HIGH if last_act else SourceReliability.MEDIUM,
    )

    conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(
        confidence_val,
        quality_flags=quality_assessment.data_quality_flags,
        confidence_penalty=quality_assessment.confidence_penalty,
    )
    for note in quality_assessment.disclosure_notes:
        if note not in uncert_reasons:
            uncert_reasons.append(note)

    why_it_matters = (
        f"In consulting and advisory, repeat business and account expansion represent 60–80% of revenue. "
        f"Strategic account '{comp_name}' has had zero touchpoints for {days_inactive} days, "
        "increasing risk of sponsor churn and competitor penetration."
    )
    trigger_title = (
        f"Inactivity threshold breached: {days_inactive} days without recorded touchpoints"
    )

    commercial_ctx = {
        "account_name": comp_name,
        "domain": comp.domain,
        "tier": comp.attributes.get("tier") if comp.attributes else None,
        "segment": comp.attributes.get("segment") if comp.attributes else None,
        "last_activity_type": last_act.type if last_act else None,
        "last_activity_title": last_act.title if last_act else None,
    }

    evidence_status, evidence_notes = determine_evidence_status(
        days_elapsed=days_inactive,
        max_fresh_days=90,
        is_uncertain=is_uncertain,
        missing_required=not bool(comp.id),
        verification_status="verified" if last_act else "probable",
    )

    evidence = build_evidence_payload(
        evidence_type="temporal_inactivity",
        source_entity_type="company",
        source_entity_id=str(comp.id),
        source_display=f"Account Interaction History ({comp_name})",
        trigger_event_title=trigger_title,
        why_it_matters_now=why_it_matters,
        occurred_at=last_act.occurred_at.isoformat() if last_act and last_act.occurred_at else None,
        days_elapsed=days_inactive,
        excerpt=f"No touchpoints recorded for {days_inactive} days on strategic account '{comp_name}'",
        evidence_status=evidence_status,
        evidence_notes=evidence_notes,
        commercial_context=commercial_ctx,
        key_metrics={
            "days_inactive": days_inactive,
            "threshold_days": 60 if severity == "high" else 90,
            "account_tier": commercial_ctx.get("tier"),
        },
        verification_status="verified" if last_act else "probable",
        source_reliability=quality_assessment.source_reliability.value,
        data_quality_flags=quality_assessment.data_quality_flags,
        disclosure_notes=quality_assessment.disclosure_notes,
        has_quality_warning=quality_assessment.has_quality_warning,
    )

    title = f"Dormant Strategic Account: {comp_name} ({days_inactive}d inactive)"
    summary = (
        f"Strategic account '{comp_name}' has had no recorded meetings, calls, or communications "
        f"for {days_inactive} days. Proactive re-engagement recommended."
    )

    meta = build_signal_meta(
        conf_score,
        conf_tier,
        is_uncertain,
        uncert_reasons,
        evidence,
        days_inactive=days_inactive,
        company_name=comp_name,
        why_it_matters_now=why_it_matters,
        has_data_quality_warning=quality_assessment.has_quality_warning,
        data_quality_flags=quality_assessment.data_quality_flags,
        source_reliability=quality_assessment.source_reliability.value,
        is_suppressed=quality_assessment.is_suppressed,
    )

    return await _upsert_detected_signal(
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
