import uuid
from collections.abc import Sequence

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cdb.models.base import utc_now
from cdb.models.signal import DetectedSignal, Signal
from cdb.models.user import User
from cdb.schemas.signals import (
    DetectedSignalResponse,
    DetectedSignalStatsResponse,
    DetectedSignalStatus,
    DetectedSignalUpdate,
    SignalDefinition,
    SignalSeverity,
)


def _to_detected_response(sig: DetectedSignal) -> DetectedSignalResponse:
    """Converts ORM DetectedSignal into rich response model."""
    comp_name = sig.company.name if sig.company else None
    person_name = f"{sig.person.first_name} {sig.person.last_name}" if sig.person else None
    opp_title = sig.opportunity.title if sig.opportunity else None
    eng_title = sig.engagement.title if sig.engagement else None

    return DetectedSignalResponse(
        id=sig.id,
        signal_id=sig.signal_id,
        signal=SignalDefinition.model_validate(sig.signal) if sig.signal else None,
        company_id=sig.company_id,
        company_name=comp_name,
        person_id=sig.person_id,
        person_name=person_name,
        opportunity_id=sig.opportunity_id,
        opportunity_title=opp_title,
        engagement_id=sig.engagement_id,
        engagement_title=eng_title,
        activity_id=sig.activity_id,
        status=DetectedSignalStatus(sig.status),
        severity=SignalSeverity(sig.severity),
        score=sig.score,
        title=sig.title,
        summary=sig.summary,
        metadata_payload=sig.metadata_payload or {},
        actioned_at=sig.actioned_at,
        actioned_by_id=sig.actioned_by_id,
        resolution_notes=sig.resolution_notes,
        detected_at=sig.detected_at,
        expires_at=sig.expires_at,
        created_at=sig.created_at,
        updated_at=sig.updated_at,
    )


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

    # Count total matching records
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.scalar(count_stmt)) or 0

    stmt = stmt.limit(limit).offset(offset)
    records = (await db.execute(stmt)).scalars().all()

    return [_to_detected_response(r) for r in records], total


async def get_detected_signal_stats(db: AsyncSession) -> DetectedSignalStatsResponse:
    """
    Computes summary breakdown metrics across all detected signals.
    """
    stmt = select(DetectedSignal).join(Signal, Signal.id == DetectedSignal.signal_id)
    records: Sequence[DetectedSignal] = (await db.execute(stmt)).scalars().all()

    by_severity: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_signal: dict[str, int] = {}
    by_status: dict[str, int] = {}
    total_active = 0

    for r in records:
        by_status[r.status] = by_status.get(r.status, 0) + 1
        if r.status == "active":
            total_active += 1
            by_severity[r.severity] = by_severity.get(r.severity, 0) + 1
            if r.signal:
                by_category[r.signal.category] = by_category.get(r.signal.category, 0) + 1
            by_signal[r.signal_id] = by_signal.get(r.signal_id, 0) + 1

    return DetectedSignalStatsResponse(
        total_active=total_active,
        by_severity=by_severity,
        by_category=by_category,
        by_signal=by_signal,
        by_status=by_status,
    )


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
    return _to_detected_response(sig)
