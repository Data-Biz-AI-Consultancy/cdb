"""
cdb.services.signals.metrics

Computes success, quality, operational latency, and business/revenue impact metrics
for detected signals across configurable lookback windows.
"""

import datetime
import statistics
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cdb.models.activity import Activity
from cdb.models.base import utc_now
from cdb.models.engagement import Engagement
from cdb.models.opportunity import Opportunity, OpportunityCompany
from cdb.models.signal import DetectedSignal, Signal
from cdb.schemas.signals import (
    SignalLatencyMetrics,
    SignalMetricsBreakdownItem,
    SignalMetricsResponse,
    SignalOutcomeMetrics,
    SignalQualityMetrics,
    SignalRevenueMetrics,
)
from cdb.services.signals.catalog.data import INITIAL_SIGNAL_CATALOG

_SIGNAL_NAME_MAP = {item["id"]: item["name"] for item in INITIAL_SIGNAL_CATALOG}
_SIGNAL_CATEGORY_MAP = {item["id"]: item["category"] for item in INITIAL_SIGNAL_CATALOG}
_SIGNAL_SEVERITY_MAP = {item["id"]: item["severity"] for item in INITIAL_SIGNAL_CATALOG}


async def compute_signal_success_metrics(
    db: AsyncSession,
    lookback_days: int = 90,
    signal_id: str | None = None,
    category: str | None = None,
    severity: str | None = None,
) -> SignalMetricsResponse:
    """
    Computes comprehensive success, quality, latency, downstream outcome,
    and revenue attribution metrics for detected signals within the given lookback window.
    """
    lookback_days = max(1, min(730, lookback_days))
    now = utc_now()
    cutoff = now - datetime.timedelta(days=lookback_days)

    stmt = (
        select(DetectedSignal)
        .options(
            selectinload(DetectedSignal.signal),
            selectinload(DetectedSignal.company),
            selectinload(DetectedSignal.opportunity),
            selectinload(DetectedSignal.engagement),
        )
        .where(DetectedSignal.detected_at >= cutoff)
    )

    if signal_id:
        stmt = stmt.where(DetectedSignal.signal_id == signal_id)
    if severity:
        stmt = stmt.where(DetectedSignal.severity == severity)
    if category:
        stmt = stmt.join(Signal, Signal.id == DetectedSignal.signal_id).where(
            Signal.category == category
        )

    records: list[DetectedSignal] = list((await db.execute(stmt)).scalars().all())

    # 1. Quality Metrics
    total_detected = len(records)
    total_actioned = sum(1 for r in records if r.status == "actioned")
    total_dismissed = sum(1 for r in records if r.status == "dismissed")
    total_resolved = sum(1 for r in records if r.status == "resolved")
    total_snoozed = sum(1 for r in records if r.status == "snoozed")
    total_active = sum(1 for r in records if r.status == "active")
    total_reopened = sum(1 for r in records if (r.reopen_count or 0) > 0)

    action_rate = (
        round((total_actioned + total_resolved) / total_detected, 4) if total_detected > 0 else 0.0
    )
    dismissal_rate = round(total_dismissed / total_detected, 4) if total_detected > 0 else 0.0
    precision_proxy = round(max(0.0, 1.0 - dismissal_rate), 4)

    total_uncertain = sum(1 for r in records if (r.metadata_payload or {}).get("is_uncertain"))
    total_conflict = sum(1 for r in records if (r.metadata_payload or {}).get("has_conflict"))

    needs_verification_rate = (
        round(total_uncertain / total_detected, 4) if total_detected > 0 else 0.0
    )
    conflict_rate = round(total_conflict / total_detected, 4) if total_detected > 0 else 0.0

    quality = SignalQualityMetrics(
        total_detected=total_detected,
        total_actioned=total_actioned,
        total_dismissed=total_dismissed,
        total_resolved=total_resolved,
        total_snoozed=total_snoozed,
        total_active=total_active,
        total_reopened=total_reopened,
        action_rate=action_rate,
        dismissal_rate=dismissal_rate,
        precision_proxy=precision_proxy,
        needs_verification_rate=needs_verification_rate,
        conflict_rate=conflict_rate,
    )

    # 2. Operational Latency (Time-to-Action)
    actioned_durations_hours: list[float] = []
    sla_breaches = 0

    for r in records:
        if r.actioned_at and r.detected_at:
            duration = (r.actioned_at - r.detected_at).total_seconds() / 3600.0
            if duration >= 0:
                actioned_durations_hours.append(duration)
                # Check SLA: > 72 hours (3 days) for unanswered conversation or > 168h for others
                if r.signal_id == "unanswered_conversation" and duration > 72.0:
                    sla_breaches += 1
                elif duration > 168.0:
                    sla_breaches += 1

    total_measured = len(actioned_durations_hours)
    mean_mtta = (
        round(statistics.mean(actioned_durations_hours), 2) if actioned_durations_hours else None
    )
    median_mtta = (
        round(statistics.median(actioned_durations_hours), 2) if actioned_durations_hours else None
    )
    sla_breach_rate = round(sla_breaches / total_measured, 4) if total_measured > 0 else 0.0

    latency = SignalLatencyMetrics(
        mean_time_to_action_hours=mean_mtta,
        median_time_to_action_hours=median_mtta,
        sla_breach_count=sla_breaches,
        sla_breach_rate=sla_breach_rate,
        total_actioned_measured=total_measured,
    )

    # 3. Downstream Outcomes & 4. Revenue Attribution (90-Day Window)
    # Collect actioned signals with associated company
    actioned_signals = [
        r for r in records if r.status in ("actioned", "resolved") and r.actioned_at
    ]

    # Pre-fetch opportunities, activities, and engagements for affected companies
    company_ids = {r.company_id for r in actioned_signals if r.company_id}

    opportunities_by_company: dict[Any, list[Opportunity]] = {}
    activities_by_company: dict[Any, list[Activity]] = {}
    engagements_by_company: dict[Any, list[Engagement]] = {}

    if company_ids:
        opp_stmt = (
            select(Opportunity, OpportunityCompany.company_id)
            .join(OpportunityCompany, OpportunityCompany.opportunity_id == Opportunity.id)
            .where(OpportunityCompany.company_id.in_(company_ids))
        )
        opp_rows = list((await db.execute(opp_stmt)).all())
        for opp, cid in opp_rows:
            opportunities_by_company.setdefault(cid, []).append(opp)

        act_stmt = select(Activity).where(Activity.company_id.in_(company_ids))
        all_acts = list((await db.execute(act_stmt)).scalars().all())
        for act in all_acts:
            activities_by_company.setdefault(act.company_id, []).append(act)

        eng_stmt = select(Engagement).where(Engagement.company_id.in_(company_ids))
        all_engs = list((await db.execute(eng_stmt)).scalars().all())
        for eng in all_engs:
            engagements_by_company.setdefault(eng.company_id, []).append(eng)

    opportunity_converted_signals = 0
    account_reactivated_signals = 0
    contracts_renewed_count = 0

    influenced_pipeline_total = Decimal("0.00")
    weighted_influenced_pipeline_total = Decimal("0.00")
    protected_revenue_total = Decimal("0.00")

    total_attributed_opp_count = 0
    total_attributed_opp_with_value = 0

    attributed_opp_ids: set[Any] = set()

    # Per-signal attribution tracking for breakdown
    breakdown_by_signal_map: dict[str, dict[str, Any]] = {}
    breakdown_by_category_map: dict[str, dict[str, Any]] = {}
    breakdown_by_severity_map: dict[str, dict[str, Any]] = {}

    # Initialize all catalog signals in breakdown
    for cat_item in INITIAL_SIGNAL_CATALOG:
        sid = cat_item["id"]
        breakdown_by_signal_map[sid] = {
            "key": sid,
            "label": cat_item["name"],
            "category": cat_item["category"],
            "severity": cat_item["severity"],
            "total_detected": 0,
            "actioned_count": 0,
            "dismissed_count": 0,
            "durations": [],
            "opp_count": 0,
            "pipeline": Decimal("0.00"),
        }

    for cat in ["opportunity", "risk", "hybrid"]:
        breakdown_by_category_map[cat] = {
            "key": cat,
            "label": cat.capitalize(),
            "category": cat,
            "severity": None,
            "total_detected": 0,
            "actioned_count": 0,
            "dismissed_count": 0,
            "durations": [],
            "opp_count": 0,
            "pipeline": Decimal("0.00"),
        }

    for sev in ["critical", "high", "medium", "low"]:
        breakdown_by_severity_map[sev] = {
            "key": sev,
            "label": sev.capitalize(),
            "category": None,
            "severity": sev,
            "total_detected": 0,
            "actioned_count": 0,
            "dismissed_count": 0,
            "durations": [],
            "opp_count": 0,
            "pipeline": Decimal("0.00"),
        }

    for sig in records:
        sid = sig.signal_id
        scat = sig.signal.category if sig.signal else _SIGNAL_CATEGORY_MAP.get(sid, "hybrid")
        ssev = sig.severity

        # Init dynamic keys if unseen
        if sid not in breakdown_by_signal_map:
            breakdown_by_signal_map[sid] = {
                "key": sid,
                "label": sig.signal.name if sig.signal else sid,
                "category": scat,
                "severity": ssev,
                "total_detected": 0,
                "actioned_count": 0,
                "dismissed_count": 0,
                "snoozed_count": 0,
                "durations": [],
                "opp_count": 0,
                "pipeline": Decimal("0.00"),
            }

        breakdown_by_signal_map[sid]["total_detected"] += 1
        if scat in breakdown_by_category_map:
            breakdown_by_category_map[scat]["total_detected"] += 1
        if ssev in breakdown_by_severity_map:
            breakdown_by_severity_map[ssev]["total_detected"] += 1

        if sig.status in ("actioned", "resolved"):
            breakdown_by_signal_map[sid]["actioned_count"] += 1
            if scat in breakdown_by_category_map:
                breakdown_by_category_map[scat]["actioned_count"] += 1
            if ssev in breakdown_by_severity_map:
                breakdown_by_severity_map[ssev]["actioned_count"] += 1

            if sig.actioned_at and sig.detected_at:
                dur = (sig.actioned_at - sig.detected_at).total_seconds() / 3600.0
                if dur >= 0:
                    breakdown_by_signal_map[sid]["durations"].append(dur)
                    if scat in breakdown_by_category_map:
                        breakdown_by_category_map[scat]["durations"].append(dur)
                    if ssev in breakdown_by_severity_map:
                        breakdown_by_severity_map[ssev]["durations"].append(dur)
        elif sig.status == "dismissed":
            breakdown_by_signal_map[sid]["dismissed_count"] += 1
            if scat in breakdown_by_category_map:
                breakdown_by_category_map[scat]["dismissed_count"] += 1
            if ssev in breakdown_by_severity_map:
                breakdown_by_severity_map[ssev]["dismissed_count"] += 1
        elif sig.status == "snoozed":
            breakdown_by_signal_map[sid]["snoozed_count"] = (
                breakdown_by_signal_map[sid].get("snoozed_count", 0) + 1
            )
            if scat in breakdown_by_category_map:
                breakdown_by_category_map[scat]["snoozed_count"] = (
                    breakdown_by_category_map[scat].get("snoozed_count", 0) + 1
                )
            if ssev in breakdown_by_severity_map:
                breakdown_by_severity_map[ssev]["snoozed_count"] = (
                    breakdown_by_severity_map[ssev].get("snoozed_count", 0) + 1
                )

    # Analyze 90-day post-action outcomes for actioned signals
    for sig in actioned_signals:
        if not sig.actioned_at or not sig.company_id:
            continue

        window_start = sig.actioned_at
        window_end = sig.actioned_at + datetime.timedelta(days=90)
        cid = sig.company_id
        sid = sig.signal_id
        scat = sig.signal.category if sig.signal else _SIGNAL_CATEGORY_MAP.get(sid, "hybrid")
        ssev = sig.severity

        # Check Opportunity creation
        company_opps = opportunities_by_company.get(cid, [])
        created_in_window = [
            o for o in company_opps if o.created_at and window_start <= o.created_at <= window_end
        ]

        if created_in_window:
            opportunity_converted_signals += 1
            breakdown_by_signal_map[sid]["opp_count"] += len(created_in_window)
            if scat in breakdown_by_category_map:
                breakdown_by_category_map[scat]["opp_count"] += len(created_in_window)
            if ssev in breakdown_by_severity_map:
                breakdown_by_severity_map[ssev]["opp_count"] += len(created_in_window)

            for opp in created_in_window:
                if opp.id not in attributed_opp_ids:
                    attributed_opp_ids.add(opp.id)
                    total_attributed_opp_count += 1
                    if opp.value is not None:
                        total_attributed_opp_with_value += 1
                        val = Decimal(str(opp.value))
                        influenced_pipeline_total += val
                        breakdown_by_signal_map[sid]["pipeline"] += val
                        if scat in breakdown_by_category_map:
                            breakdown_by_category_map[scat]["pipeline"] += val
                        if ssev in breakdown_by_severity_map:
                            breakdown_by_severity_map[ssev]["pipeline"] += val

                        prob = Decimal(str(opp.probability or 100)) / Decimal(100)
                        weighted_influenced_pipeline_total += val * prob

        # Check Account Reactivation for risk signals
        if scat in ("risk", "hybrid"):
            company_acts = activities_by_company.get(cid, [])
            reactivated_acts = [
                a
                for a in company_acts
                if a.occurred_at and window_start <= a.occurred_at <= window_end
            ]
            if reactivated_acts:
                account_reactivated_signals += 1

        # Check Contract Renewal for expiring contracts
        if sid == "expiring_contract":
            company_engs = engagements_by_company.get(cid, [])
            renewed_engs = [
                e
                for e in company_engs
                if e.status in ("active", "in_delivery", "completed")
                and (
                    e.contract_status == "signed"
                    or (e.signed_at and e.signed_at >= window_start.date())
                )
            ]
            if renewed_engs:
                contracts_renewed_count += 1
                for eng in renewed_engs:
                    if eng.total_value is not None:
                        protected_revenue_total += Decimal(str(eng.total_value))

    total_actioned_count = len(actioned_signals)
    opp_conversion_rate = (
        round(opportunity_converted_signals / total_actioned_count, 4)
        if total_actioned_count > 0
        else 0.0
    )
    reactivation_rate = (
        round(account_reactivated_signals / total_actioned_count, 4)
        if total_actioned_count > 0
        else 0.0
    )
    renewal_rate = (
        round(contracts_renewed_count / total_actioned_count, 4)
        if total_actioned_count > 0
        else 0.0
    )
    value_coverage_rate = (
        round(total_attributed_opp_with_value / total_attributed_opp_count, 4)
        if total_attributed_opp_count > 0
        else 1.0
    )

    outcomes = SignalOutcomeMetrics(
        attribution_window_days=90,
        opportunities_created_count=opportunity_converted_signals,
        opportunity_conversion_rate=opp_conversion_rate,
        account_reactivations_count=account_reactivated_signals,
        account_reactivation_rate=reactivation_rate,
        contracts_renewed_count=contracts_renewed_count,
        contract_renewal_rate=renewal_rate,
    )

    revenue = SignalRevenueMetrics(
        influenced_pipeline_total=influenced_pipeline_total,
        weighted_influenced_pipeline_total=weighted_influenced_pipeline_total,
        protected_revenue_total=protected_revenue_total,
        currency="USD",
        value_coverage_rate=value_coverage_rate,
    )

    # Convert breakdown dicts to response items
    def _to_breakdown_item(data: dict[str, Any]) -> SignalMetricsBreakdownItem:
        tot = data["total_detected"]
        act = data["actioned_count"]
        durs = data["durations"]
        return SignalMetricsBreakdownItem(
            key=data["key"],
            label=data["label"],
            category=data["category"],
            severity=data["severity"],
            total_detected=tot,
            actioned_count=act,
            dismissed_count=data.get("dismissed_count", 0),
            snoozed_count=data.get("snoozed_count", 0),
            action_rate=round(act / tot, 4) if tot > 0 else 0.0,
            mean_time_to_action_hours=round(statistics.mean(durs), 2) if durs else None,
            opportunities_created_count=data["opp_count"],
            influenced_pipeline=data["pipeline"],
        )

    by_signal_items = [_to_breakdown_item(d) for d in breakdown_by_signal_map.values()]
    by_category_items = [_to_breakdown_item(d) for d in breakdown_by_category_map.values()]
    by_severity_items = [_to_breakdown_item(d) for d in breakdown_by_severity_map.values()]

    return SignalMetricsResponse(
        lookback_days=lookback_days,
        evaluated_at=now,
        quality=quality,
        latency=latency,
        outcomes=outcomes,
        revenue=revenue,
        by_signal=by_signal_items,
        by_category=by_category_items,
        by_severity=by_severity_items,
    )


__all__ = ["compute_signal_success_metrics"]
