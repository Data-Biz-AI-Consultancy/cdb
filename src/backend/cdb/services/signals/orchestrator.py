"""
cdb.services.signals.orchestrator

Master orchestrator that runs all six catalog signal detectors, retires stale
active signals that no longer meet detection criteria, and evaluates
multi-entity conflicts across Company, Opportunity, and Person scopes.
"""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.base import utc_now
from cdb.models.signal import DetectedSignal
from cdb.services.signals.catalog import ensure_signals_dimension
from cdb.services.signals.classification import detect_signal_conflicts
from cdb.services.signals.detectors import (
    detect_competitor_signals,
    detect_dormant_strategic_accounts,
    detect_expiring_contracts,
    detect_hiring_funding_events,
    detect_leadership_changes,
    detect_unanswered_conversations,
)

_MANAGED_SIGNAL_IDS: list[str] = [
    "dormant_strategic_account",
    "unanswered_conversation",
    "expiring_contract",
    "leadership_change",
    "hiring_funding_event",
    "competitor_signal",
]


async def evaluate_all_signals(db: AsyncSession, lookback_days: int = 90) -> dict[str, Any]:
    """
    Master orchestrator running detection rules across all 6 catalog signals
    within the configured lookback window (default: 90 days; up to 730 days / 2 years),
    followed by retiring outdated signals and evaluating multi-entity conflicts.
    """
    lookback_days = max(1, min(730, lookback_days))
    await ensure_signals_dimension(db)
    now = utc_now()

    dormant = await detect_dormant_strategic_accounts(db, now)
    unanswered = await detect_unanswered_conversations(db, now, lookback_days=lookback_days)
    contracts = await detect_expiring_contracts(db, now)
    leadership = await detect_leadership_changes(db, now, lookback_days=lookback_days)
    growth = await detect_hiring_funding_events(db, now, lookback_days=lookback_days)
    competitors = await detect_competitor_signals(db, now, lookback_days=lookback_days)

    all_pairs = dormant + unanswered + contracts + leadership + growth + competitors
    await db.flush()

    # Automatically retire/dismiss active signals for managed catalog signals that were not
    # detected in this run (e.g. outside the selected lookback window or criteria no longer met)
    detected_ids = {sig.id for sig, _ in all_pairs}
    stale_stmt = select(DetectedSignal).where(
        DetectedSignal.status == "active",
        DetectedSignal.signal_id.in_(_MANAGED_SIGNAL_IDS),
        DetectedSignal.id.not_in(detected_ids),
    )
    stale_signals = (await db.execute(stale_stmt)).scalars().all()
    for stale_sig in stale_signals:
        stale_sig.status = "dismissed"
        meta = dict(stale_sig.metadata_payload or {})
        meta["auto_retired"] = True
        meta["retired_reason"] = (
            f"Outside {lookback_days}d lookback window or criteria no longer met"
        )
        stale_sig.metadata_payload = meta
        stale_sig.updated_at = now

    await db.flush()

    # Query all active/acknowledged signals to evaluate multi-entity conflicts
    active_signals_stmt = select(DetectedSignal).where(
        DetectedSignal.status.in_(["active", "acknowledged"])
    )
    active_signals = (await db.execute(active_signals_stmt)).scalars().all()

    # Detect conflicts across Company, Opportunity, and Person scopes
    conflict_map = detect_signal_conflicts(list(active_signals))

    total_conflicting = 0
    total_uncertain = 0

    for sig in active_signals:
        sig_id_str = str(sig.id)
        c_info = conflict_map.get(sig_id_str, {})
        meta = dict(sig.metadata_payload or {})

        meta["has_conflict"] = c_info.get("has_conflict", False)
        meta["conflicting_signal_ids"] = c_info.get("conflicting_signal_ids", [])
        meta["conflict_summary"] = c_info.get("conflict_summary")
        meta["conflict_scope"] = c_info.get("conflict_scope")

        if meta["has_conflict"]:
            total_conflicting += 1
        if meta.get("is_uncertain", False):
            total_uncertain += 1

        sig.metadata_payload = meta

    await db.commit()

    by_signal: dict[str, int] = {}
    new_count = 0
    refreshed_count = 0

    for sig, is_new in all_pairs:
        by_signal[sig.signal_id] = by_signal.get(sig.signal_id, 0) + 1
        if is_new:
            new_count += 1
        else:
            refreshed_count += 1

    total_active = len(active_signals)

    return {
        "status": "success",
        "evaluated_at": now,
        "lookback_days": lookback_days,
        "total_active_signals": total_active,
        "total_conflicting": total_conflicting,
        "total_uncertain": total_uncertain,
        "new_signals_detected": new_count,
        "refreshed_signals": refreshed_count,
        "by_signal": by_signal,
    }
