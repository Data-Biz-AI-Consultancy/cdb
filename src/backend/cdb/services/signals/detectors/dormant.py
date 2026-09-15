"""
cdb.services.signals.detectors.dormant

Detects dormant strategic accounts: companies with past signed contracts or
closed-won deals that have had no recorded touchpoints for > 60 days.
"""

import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.opportunity import Opportunity
from cdb.models.signal import DetectedSignal
from cdb.services.signals._helpers import _upsert_detected_signal
from cdb.services.signals.classification import assess_confidence, build_evidence_payload


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
