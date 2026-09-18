"""
cdb.services.signals.orchestrator

Master orchestrator that runs all six catalog signal detectors, handles deduplication
fingerprinting, retires stale active signals that no longer meet detection criteria,
and evaluates multi-entity conflicts across Company, Opportunity, and Person scopes.
"""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.base import utc_now
from cdb.models.signal import DetectedSignal
from cdb.services.signals.catalog import ensure_signals_dimension
from cdb.services.signals.classification import (
    apply_conflict_metadata,
    detect_signal_conflicts,
)
from cdb.services.signals.detected import retire_stale_detected_signals
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

    # Automatically retire/dismiss active signals that were not detected in this run
    detected_ids = {sig.id for sig, _ in all_pairs}
    await retire_stale_detected_signals(db, _MANAGED_SIGNAL_IDS, detected_ids, lookback_days, now)
    await db.flush()

    # Query all active/acknowledged signals to evaluate multi-entity conflicts
    active_signals_stmt = select(DetectedSignal).where(
        DetectedSignal.status.in_(["active", "acknowledged"])
    )
    active_signals = list((await db.execute(active_signals_stmt)).scalars().all())

    # Detect and apply conflicts across Company, Opportunity, and Person scopes
    conflict_map = detect_signal_conflicts(active_signals)
    total_conflicting, total_uncertain = apply_conflict_metadata(active_signals, conflict_map)

    # Query snoozed and reopened counts
    snoozed_count_stmt = select(func.count()).select_from(
        select(DetectedSignal).where(DetectedSignal.status == "snoozed").subquery()
    )
    total_snoozed = (await db.scalar(snoozed_count_stmt)) or 0

    reopened_count_stmt = select(func.count()).select_from(
        select(DetectedSignal).where(DetectedSignal.reopen_count > 0).subquery()
    )
    total_reopened = (await db.scalar(reopened_count_stmt)) or 0

    await db.commit()

    by_signal: dict[str, int] = {}
    new_count = 0
    refreshed_count = 0
    suppressed_count = 0

    for sig, is_new in all_pairs:
        by_signal[sig.signal_id] = by_signal.get(sig.signal_id, 0) + 1
        if sig.status in ("dismissed", "resolved", "snoozed"):
            suppressed_count += 1
        elif is_new:
            new_count += 1
        else:
            refreshed_count += 1

    total_active = len(active_signals)

    return {
        "status": "success",
        "evaluated_at": now,
        "lookback_days": lookback_days,
        "total_active_signals": total_active,
        "total_snoozed_signals": total_snoozed,
        "total_suppressed_duplicates": suppressed_count,
        "total_reopened_signals": total_reopened,
        "total_conflicting": total_conflicting,
        "total_uncertain": total_uncertain,
        "new_signals_detected": new_count,
        "refreshed_signals": refreshed_count,
        "by_signal": by_signal,
    }
