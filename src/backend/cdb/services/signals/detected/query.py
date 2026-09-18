"""
cdb.services.signals.detected.query

Querying, statistical aggregation, account-level grouping, and single-record retrieval for detected signals.
"""

import datetime
import uuid
from collections.abc import Sequence

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cdb.models.base import utc_now
from cdb.models.signal import DetectedSignal, DetectedSignalPerson, Signal
from cdb.schemas.signals import (
    DetectedSignalResponse,
    DetectedSignalStatsResponse,
    DetectedSignalStatus,
    GroupedDetectedSignalsItem,
    GroupedDetectedSignalsResponse,
    SignalSeverity,
)
from cdb.services.signals.detected.mapper import to_detected_response


async def list_detected_signals(
    db: AsyncSession,
    signal_id: str | None = None,
    category: str | None = None,
    status: DetectedSignalStatus | None = None,
    severity: SignalSeverity | None = None,
    company_id: uuid.UUID | None = None,
    person_id: uuid.UUID | None = None,
    opportunity_id: uuid.UUID | None = None,
    engagement_id: uuid.UUID | None = None,
    is_uncertain: bool | None = None,
    has_conflict: bool | None = None,
    lookback_days: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[DetectedSignalResponse], int]:
    """
    Lists detected signals with multi-dimensional filtering.
    """
    stmt: Select = (
        select(DetectedSignal)
        .options(
            selectinload(DetectedSignal.signal),
            selectinload(DetectedSignal.company),
            selectinload(DetectedSignal.person),
            selectinload(DetectedSignal.opportunity),
            selectinload(DetectedSignal.engagement),
            selectinload(DetectedSignal.signal_persons).selectinload(DetectedSignalPerson.person),
            selectinload(DetectedSignal.connected_persons),
        )
        .order_by(DetectedSignal.detected_at.desc())
    )

    if signal_id:
        stmt = stmt.where(DetectedSignal.signal_id == signal_id)
    if status:
        stmt = stmt.where(DetectedSignal.status == status.value)
    if severity:
        stmt = stmt.where(DetectedSignal.severity == severity.value)
    if company_id:
        stmt = stmt.where(DetectedSignal.company_id == company_id)
    if person_id:
        stmt = stmt.where(DetectedSignal.person_id == person_id)
    if opportunity_id:
        stmt = stmt.where(DetectedSignal.opportunity_id == opportunity_id)
    if engagement_id:
        stmt = stmt.where(DetectedSignal.engagement_id == engagement_id)
    if category:
        stmt = stmt.join(Signal, Signal.id == DetectedSignal.signal_id).where(
            Signal.category == category
        )
    if lookback_days:
        cutoff = utc_now() - datetime.timedelta(days=lookback_days)
        stmt = stmt.where(DetectedSignal.detected_at >= cutoff)

    bind = db.get_bind()
    is_sqlite = getattr(bind.dialect, "name", "") == "sqlite"

    if is_uncertain is not None:
        if is_sqlite:
            target_val = 1 if is_uncertain else 0
            stmt = stmt.where(
                func.json_extract(DetectedSignal.metadata_payload, "$.is_uncertain") == target_val
            )
        else:
            stmt = stmt.where(
                DetectedSignal.metadata_payload["is_uncertain"].as_boolean() == is_uncertain
            )

    if has_conflict is not None:
        if is_sqlite:
            target_val = 1 if has_conflict else 0
            stmt = stmt.where(
                func.json_extract(DetectedSignal.metadata_payload, "$.has_conflict") == target_val
            )
        else:
            stmt = stmt.where(
                DetectedSignal.metadata_payload["has_conflict"].as_boolean() == has_conflict
            )

    # Count total matching records
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.scalar(count_stmt)) or 0

    stmt = stmt.limit(limit).offset(offset)
    records = (await db.execute(stmt)).scalars().all()

    return [to_detected_response(r) for r in records], total


async def list_grouped_detected_signals(
    db: AsyncSession,
    signal_id: str | None = None,
    category: str | None = None,
    status: DetectedSignalStatus | None = None,
    severity: SignalSeverity | None = None,
    company_id: uuid.UUID | None = None,
    lookback_days: int | None = None,
    limit: int = 100,
) -> GroupedDetectedSignalsResponse:
    """
    Groups detected signals by Account / Company for unified organization-level triage.
    """
    signals, total = await list_detected_signals(
        db,
        signal_id=signal_id,
        category=category,
        status=status,
        severity=severity,
        company_id=company_id,
        lookback_days=lookback_days,
        limit=limit,
        offset=0,
    )

    groups_dict: dict[str, list[DetectedSignalResponse]] = {}
    names_dict: dict[str, str] = {}
    company_ids_dict: dict[str, uuid.UUID | None] = {}

    for sig in signals:
        if sig.company_id:
            g_key = str(sig.company_id)
            g_name = sig.company_name or "Unknown Company"
            c_id = sig.company_id
        elif sig.person_id:
            g_key = f"person_{sig.person_id}"
            g_name = f"Contact: {sig.person_name or 'Direct Contact'}"
            c_id = None
        else:
            g_key = "unaffiliated"
            g_name = "Unaffiliated Signals"
            c_id = None

        if g_key not in groups_dict:
            groups_dict[g_key] = []
            names_dict[g_key] = g_name
            company_ids_dict[g_key] = c_id

        groups_dict[g_key].append(sig)

    items: list[GroupedDetectedSignalsItem] = []
    for g_key, group_signals in groups_dict.items():
        items.append(
            GroupedDetectedSignalsItem(
                group_key=g_key,
                group_name=names_dict[g_key],
                company_id=company_ids_dict[g_key],
                total_signals=len(group_signals),
                signals=group_signals,
            )
        )

    # Sort groups by count descending
    items.sort(key=lambda x: x.total_signals, reverse=True)

    return GroupedDetectedSignalsResponse(
        data=items,
        total_groups=len(items),
        total_signals=total,
    )


async def get_detected_signal_stats(
    db: AsyncSession, lookback_days: int | None = None
) -> DetectedSignalStatsResponse:
    """
    Computes summary breakdown metrics across all detected signals.
    Optionally constrained to a lookback window.
    """
    stmt = select(DetectedSignal).options(selectinload(DetectedSignal.signal))
    if lookback_days:
        cutoff = utc_now() - datetime.timedelta(days=lookback_days)
        stmt = stmt.where(DetectedSignal.detected_at >= cutoff)
    records: Sequence[DetectedSignal] = (await db.execute(stmt)).scalars().all()

    by_severity: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_signal: dict[str, int] = {}
    by_status: dict[str, int] = {}
    total_active = 0
    total_snoozed = 0
    total_conflicting = 0
    total_uncertain = 0

    for r in records:
        by_status[r.status] = by_status.get(r.status, 0) + 1
        if r.status == "active":
            total_active += 1
            meta = r.metadata_payload or {}
            if meta.get("has_conflict"):
                total_conflicting += 1
            if meta.get("is_uncertain"):
                total_uncertain += 1
            by_severity[r.severity] = by_severity.get(r.severity, 0) + 1
            if r.signal:
                by_category[r.signal.category] = by_category.get(r.signal.category, 0) + 1
            by_signal[r.signal_id] = by_signal.get(r.signal_id, 0) + 1
        elif r.status == "snoozed":
            total_snoozed += 1

    return DetectedSignalStatsResponse(
        total_active=total_active,
        total_snoozed=total_snoozed,
        total_conflicting=total_conflicting,
        total_uncertain=total_uncertain,
        by_severity=by_severity,
        by_category=by_category,
        by_signal=by_signal,
        by_status=by_status,
    )


async def get_detected_signal(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
) -> DetectedSignalResponse | None:
    """
    Retrieves a single detected signal by ID with eager-loaded relations.
    """
    stmt = (
        select(DetectedSignal)
        .where(DetectedSignal.id == signal_instance_id)
        .options(
            selectinload(DetectedSignal.signal),
            selectinload(DetectedSignal.company),
            selectinload(DetectedSignal.person),
            selectinload(DetectedSignal.opportunity),
            selectinload(DetectedSignal.engagement),
            selectinload(DetectedSignal.signal_persons).selectinload(DetectedSignalPerson.person),
            selectinload(DetectedSignal.connected_persons),
        )
    )
    sig = (await db.execute(stmt)).scalar_one_or_none()
    if not sig:
        return None
    return to_detected_response(sig)


__all__ = [
    "list_detected_signals",
    "list_grouped_detected_signals",
    "get_detected_signal_stats",
    "get_detected_signal",
]
