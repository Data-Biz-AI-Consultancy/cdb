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
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
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
    conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(confidence_val)

    evidence = build_evidence_payload(
        evidence_type="temporal_inactivity",
        source_entity_type="company",
        source_entity_id=str(comp.id),
        occurred_at=last_act.occurred_at.isoformat() if last_act and last_act.occurred_at else None,
        days_elapsed=days_inactive,
        excerpt=f"No touchpoints recorded for {days_inactive} days on strategic account '{comp_name}'",
        key_metrics={
            "days_inactive": days_inactive,
            "threshold_days": 60 if severity == "high" else 90,
        },
        verification_status="verified" if last_act else "probable",
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
