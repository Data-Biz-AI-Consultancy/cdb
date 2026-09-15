"""
cdb.services.signals.detected.lifecycle

Lifecycle state machine updates and resolution handling for detected signals.
"""

import uuid

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


__all__ = ["update_detected_signal"]
