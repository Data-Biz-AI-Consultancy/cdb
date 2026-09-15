"""
cdb.services.signals.detected.lifecycle

Lifecycle state machine updates and resolution handling for detected signals.
"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cdb.models.base import utc_now
from cdb.models.signal import DetectedSignal, DetectedSignalPerson
from cdb.models.user import User
from cdb.schemas.signals import (
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
    Updates status and resolution details of a detected signal.
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

    if payload.status in [
        DetectedSignalStatus.ACTIONED,
        DetectedSignalStatus.DISMISSED,
        DetectedSignalStatus.RESOLVED,
    ]:
        sig.actioned_at = now
        if user:
            sig.actioned_by_id = user.id

    sig.updated_at = now
    await db.commit()
    await db.refresh(sig)
    return to_detected_response(sig)


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


__all__ = ["update_detected_signal", "retire_stale_detected_signals"]
