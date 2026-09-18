"""
cdb.services.signals.detected.lifecycle

Lifecycle state machine updates and resolution handling for detected signals.
Supports acknowledge, action, snooze, dismiss, resolve, bulk status transitions,
and retiring stale active signals.
"""

import datetime
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cdb.models.base import utc_now
from cdb.models.signal import DetectedSignal, DetectedSignalPerson
from cdb.models.user import User
from cdb.schemas.signals import (
    BulkSignalStatusUpdateRequest,
    BulkSignalStatusUpdateResponse,
    DetectedSignalResponse,
    DetectedSignalStatus,
    DetectedSignalUpdate,
)
from cdb.services.signals.detected.mapper import to_detected_response


async def update_detected_signal(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
    payload: DetectedSignalUpdate,
    user: User | None = None,
) -> DetectedSignalResponse | None:
    """
    Updates status and resolution details of a detected signal, including snoozing.
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

    now = utc_now()
    sig.status = payload.status.value

    if payload.resolution_notes is not None:
        sig.resolution_notes = payload.resolution_notes

    # Handle Snoozing
    if payload.status == DetectedSignalStatus.SNOOZED:
        if payload.snooze_until:
            sig.snoozed_until = payload.snooze_until
        elif payload.snooze_days:
            sig.snoozed_until = now + datetime.timedelta(days=payload.snooze_days)
        else:
            # Default snooze: 14 days
            sig.snoozed_until = now + datetime.timedelta(days=14)
    else:
        # If moving to another status, clear snooze timestamp
        if payload.status != DetectedSignalStatus.SNOOZED:
            sig.snoozed_until = None

    if payload.status in [
        DetectedSignalStatus.ACTIONED,
        DetectedSignalStatus.DISMISSED,
        DetectedSignalStatus.RESOLVED,
        DetectedSignalStatus.SNOOZED,
    ]:
        sig.actioned_at = now
        if user:
            sig.actioned_by_id = user.id

    sig.updated_at = now
    await db.commit()
    await db.refresh(sig)
    return to_detected_response(sig)


async def bulk_update_detected_signals(
    db: AsyncSession,
    payload: BulkSignalStatusUpdateRequest,
    user: User | None = None,
) -> BulkSignalStatusUpdateResponse:
    """
    Bulk updates the status and resolution notes of multiple detected signals.
    """
    now = utc_now()
    stmt = select(DetectedSignal).where(DetectedSignal.id.in_(payload.signal_ids))
    signals = list((await db.execute(stmt)).scalars().all())

    if not signals:
        return BulkSignalStatusUpdateResponse(
            success=False,
            updated_count=0,
            affected_ids=[],
            message="No matching detected signals found.",
        )

    snoozed_until: datetime.datetime | None = None
    if payload.status == DetectedSignalStatus.SNOOZED:
        if payload.snooze_until:
            snoozed_until = payload.snooze_until
        elif payload.snooze_days:
            snoozed_until = now + datetime.timedelta(days=payload.snooze_days)
        else:
            snoozed_until = now + datetime.timedelta(days=14)

    affected_ids: list[uuid.UUID] = []
    for sig in signals:
        sig.status = payload.status.value
        if payload.resolution_notes is not None:
            sig.resolution_notes = payload.resolution_notes

        if payload.status == DetectedSignalStatus.SNOOZED:
            sig.snoozed_until = snoozed_until
        else:
            sig.snoozed_until = None

        if payload.status in [
            DetectedSignalStatus.ACTIONED,
            DetectedSignalStatus.DISMISSED,
            DetectedSignalStatus.RESOLVED,
            DetectedSignalStatus.SNOOZED,
        ]:
            sig.actioned_at = now
            if user:
                sig.actioned_by_id = user.id

        sig.updated_at = now
        affected_ids.append(sig.id)

    await db.commit()
    action_label = payload.status.value
    return BulkSignalStatusUpdateResponse(
        success=True,
        updated_count=len(affected_ids),
        affected_ids=affected_ids,
        message=f"Successfully marked {len(affected_ids)} signal(s) as {action_label}.",
    )


async def retire_stale_detected_signals(
    db: AsyncSession,
    managed_signal_ids: list[str],
    active_detected_ids: set[Any],
    lookback_days: int,
    now: Any,
) -> list[DetectedSignal]:
    """
    Retires (dismisses) active signals for managed catalog signals that were not
    detected in the current run (e.g. aged out or qualification criteria no longer met).
    Does NOT retire snoozed signals.
    """
    stale_stmt = select(DetectedSignal).where(
        DetectedSignal.status == "active",
        DetectedSignal.signal_id.in_(managed_signal_ids),
        DetectedSignal.id.not_in(active_detected_ids),
    )
    stale_signals = list((await db.execute(stale_stmt)).scalars().all())
    for stale_sig in stale_signals:
        stale_sig.status = "dismissed"
        meta = dict(stale_sig.metadata_payload or {})
        meta["auto_retired"] = True
        meta["retired_reason"] = (
            f"Outside {lookback_days}d lookback window or criteria no longer met"
        )
        stale_sig.metadata_payload = meta
        stale_sig.updated_at = now

    return stale_signals


__all__ = [
    "update_detected_signal",
    "bulk_update_detected_signals",
    "retire_stale_detected_signals",
]
