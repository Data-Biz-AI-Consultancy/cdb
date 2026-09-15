"""
cdb.services.signals.detectors.contracts

Detects signed active engagements whose expected_end_date is within 60 days,
signalling an expiring contract that requires renewal or extension action.
"""

import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.engagement import Engagement
from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import (
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
)
from cdb.services.signals.utils import _upsert_detected_signal


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
