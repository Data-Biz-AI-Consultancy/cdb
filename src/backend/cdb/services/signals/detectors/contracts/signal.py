"""
cdb.services.signals.detectors.contracts.signal

Builds and persists expiring contract signals.
"""

import datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.engagement import Engagement
from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import (
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
)
from cdb.services.signals.utils import (
    _upsert_detected_signal,
    format_days_remaining_label,
)


async def create_contract_signal(
    db: AsyncSession,
    eng: Engagement,
    today: datetime.date,
) -> tuple[DetectedSignal, bool]:
    """Constructs metadata, contract milestone evidence, and persists an expiring contract signal."""
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

    status_label = format_days_remaining_label(days_left)
    title = f"Expiring Contract: {eng.title} ({status_label})"
    summary = (
        f"Engagement '{eng.title}' ends on {eng.expected_end_date.isoformat()} ({status_label}). "
        f"Contract status is '{eng.contract_status}'. Immediate renewal or extension review required."
    )

    meta = build_signal_meta(
        conf_score,
        conf_tier,
        is_uncertain,
        uncert_reasons,
        evidence,
        days_left=days_left,
        expected_end_date=eng.expected_end_date.isoformat(),
        rate_type=eng.rate_type,
        currency=eng.currency,
        rate_value=float(eng.rate_value) if eng.rate_value else None,
    )

    return await _upsert_detected_signal(
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
