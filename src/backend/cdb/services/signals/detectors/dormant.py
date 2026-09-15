"""
cdb.services.signals.detectors.dormant

Detects dormant strategic accounts: companies with past signed contracts,
closed-won deals, or strategic tags that have had no recorded touchpoints for > 60 days.
"""

import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import (
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
)
from cdb.services.signals.utils import (
    _upsert_detected_signal,
    days_between,
    get_company_display_name,
    get_strategic_companies,
)


async def detect_dormant_strategic_accounts(
    db: AsyncSession, now: datetime.datetime
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects dormant strategic accounts with past contracts, closed-won deals,
    or strategic tags that have had no touchpoints in > 60 days.
    """
    companies = await get_strategic_companies(db)
    results: list[tuple[DetectedSignal, bool]] = []

    for comp in companies:
        act_stmt = (
            select(Activity)
            .where(Activity.company_id == comp.id)
            .order_by(Activity.occurred_at.desc())
            .limit(1)
        )
        last_act = (await db.execute(act_stmt)).scalars().first()

        days_inactive = days_between(last_act.occurred_at if last_act else None, now, default=180)
        if last_act and days_inactive < 60:
            continue  # Active, not dormant

        comp_name = get_company_display_name(comp)
        severity = "critical" if days_inactive >= 90 else "high"
        confidence_val = Decimal("0.90") if last_act else Decimal("0.70")
        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(confidence_val)

        evidence = build_evidence_payload(
            evidence_type="temporal_inactivity",
            source_entity_type="company",
            source_entity_id=str(comp.id),
            occurred_at=last_act.occurred_at.isoformat()
            if last_act and last_act.occurred_at
            else None,
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
