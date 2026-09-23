"""
cdb.services.signals.feedback.service

Service methods for creating, querying, and updating false-positive and
data quality feedback on detected signals.
"""

import datetime
import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cdb.models.base import utc_now
from cdb.models.signal import DetectedSignal, SignalFeedback
from cdb.models.user import User
from cdb.schemas.signals import (
    DetectedSignalStatus,
    FeedbackInvestigationStatus,
    SignalFeedbackCreate,
    SignalFeedbackResponse,
    SignalFeedbackUpdate,
)


def _to_feedback_response(fb: SignalFeedback) -> SignalFeedbackResponse:
    user_name = None
    if fb.user:
        user_name = fb.user.full_name or fb.user.email

    investigated_by_name = None
    if fb.investigated_by:
        investigated_by_name = fb.investigated_by.full_name or fb.investigated_by.email

    return SignalFeedbackResponse(
        id=fb.id,
        detected_signal_id=fb.detected_signal_id,
        user_id=fb.user_id,
        user_name=user_name,
        is_false_positive=fb.is_false_positive,
        feedback_reason=fb.feedback_reason,
        feedback_notes=fb.feedback_notes,
        suggested_action=fb.suggested_action,
        status=fb.status,
        investigated_by_id=fb.investigated_by_id,
        investigated_by_name=investigated_by_name,
        investigation_notes=fb.investigation_notes,
        investigated_at=fb.investigated_at,
        created_at=fb.created_at,
        updated_at=fb.updated_at,
    )


async def create_signal_feedback(
    db: AsyncSession,
    signal_id: uuid.UUID,
    payload: SignalFeedbackCreate,
    user: User | None = None,
) -> SignalFeedbackResponse | None:
    """
    Creates a new false-positive feedback record for a detected signal.
    If dismiss_signal is True, atomically transitions signal status to 'dismissed'.
    """
    stmt = select(DetectedSignal).where(DetectedSignal.id == signal_id)
    sig = (await db.execute(stmt)).scalar_one_or_none()
    if not sig:
        return None

    now = utc_now()
    user_id = user.id if user else None

    # Automatically dismiss the signal if requested
    if payload.dismiss_signal and sig.status != DetectedSignalStatus.DISMISSED.value:
        sig.status = DetectedSignalStatus.DISMISSED.value
        sig.actioned_at = now
        if user_id:
            sig.actioned_by_id = user_id
        res_note = f"False Positive reported: {payload.feedback_reason.value}."
        if payload.feedback_notes:
            res_note += f" {payload.feedback_notes}"
        sig.resolution_notes = res_note.strip()
        sig.updated_at = now

    feedback = SignalFeedback(
        detected_signal_id=sig.id,
        user_id=user_id,
        is_false_positive=payload.is_false_positive,
        feedback_reason=payload.feedback_reason.value,
        feedback_notes=payload.feedback_notes,
        suggested_action=payload.suggested_action,
        status=FeedbackInvestigationStatus.PENDING.value,
        created_at=now,
        updated_at=now,
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)

    # Re-fetch with relationships loaded
    full_stmt = (
        select(SignalFeedback)
        .where(SignalFeedback.id == feedback.id)
        .options(
            selectinload(SignalFeedback.user),
            selectinload(SignalFeedback.investigated_by),
        )
    )
    loaded_fb = (await db.execute(full_stmt)).scalar_one()
    return _to_feedback_response(loaded_fb)


async def list_signal_feedback(
    db: AsyncSession,
    status: str | None = None,
    feedback_reason: str | None = None,
    signal_id: uuid.UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[SignalFeedbackResponse], int]:
    """
    Lists and filters false-positive and data quality feedback entries.
    """
    stmt = (
        select(SignalFeedback)
        .options(
            selectinload(SignalFeedback.user),
            selectinload(SignalFeedback.investigated_by),
        )
        .order_by(SignalFeedback.created_at.desc())
    )
    count_stmt = select(func.count()).select_from(SignalFeedback)

    if status:
        stmt = stmt.where(SignalFeedback.status == status)
        count_stmt = count_stmt.where(SignalFeedback.status == status)

    if feedback_reason:
        stmt = stmt.where(SignalFeedback.feedback_reason == feedback_reason)
        count_stmt = count_stmt.where(SignalFeedback.feedback_reason == feedback_reason)

    if signal_id:
        stmt = stmt.where(SignalFeedback.detected_signal_id == signal_id)
        count_stmt = count_stmt.where(SignalFeedback.detected_signal_id == signal_id)

    total_count = (await db.scalar(count_stmt)) or 0
    records = list((await db.execute(stmt.offset(offset).limit(limit))).scalars().all())

    return [_to_feedback_response(r) for r in records], total_count


async def update_feedback_investigation(
    db: AsyncSession,
    feedback_id: uuid.UUID,
    payload: SignalFeedbackUpdate,
    user: User | None = None,
) -> SignalFeedbackResponse | None:
    """
    Updates the investigation status and notes for a signal feedback entry.
    """
    stmt = (
        select(SignalFeedback)
        .where(SignalFeedback.id == feedback_id)
        .options(
            selectinload(SignalFeedback.user),
            selectinload(SignalFeedback.investigated_by),
        )
    )
    fb = (await db.execute(stmt)).scalar_one_or_none()
    if not fb:
        return None

    now = utc_now()
    fb.status = payload.status.value
    if payload.investigation_notes is not None:
        fb.investigation_notes = payload.investigation_notes

    if user:
        fb.investigated_by_id = user.id
    fb.investigated_at = now
    fb.updated_at = now

    await db.commit()
    await db.refresh(fb)
    return _to_feedback_response(fb)


async def get_feedback_metrics_summary(
    db: AsyncSession,
    lookback_days: int = 90,
) -> dict[str, Any]:
    """
    Aggregates feedback and false-positive metrics within the specified lookback window.
    """
    cutoff = utc_now() - datetime.timedelta(days=lookback_days)

    stmt = select(
        SignalFeedback.feedback_reason,
        func.count(SignalFeedback.id),
    ).where(SignalFeedback.created_at >= cutoff)

    stmt = stmt.group_by(SignalFeedback.feedback_reason)
    results = (await db.execute(stmt)).all()

    by_reason: dict[str, int] = {reason: count for reason, count in results}
    total_fp = sum(by_reason.values())

    return {
        "total_false_positives": total_fp,
        "by_reason": by_reason,
    }
