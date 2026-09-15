"""
cdb.services.signals.utils.persistence

Database persistence and record mutation utilities for detected signals.
"""

import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.base import utc_now
from cdb.models.signal import DetectedSignal


async def persist_signal_record(
    db: AsyncSession,
    existing: DetectedSignal | None,
    signal_id: str,
    title: str,
    severity: str,
    summary: str | None = None,
    company_id: Any | None = None,
    person_id: Any | None = None,
    opportunity_id: Any | None = None,
    engagement_id: Any | None = None,
    activity_id: Any | None = None,
    score: Decimal | None = None,
    metadata_payload: dict[str, Any] | None = None,
    expires_at: datetime.datetime | None = None,
) -> tuple[DetectedSignal, bool]:
    """
    Updates an existing detected signal in-place or creates and flushes a new DetectedSignal record.
    Returns (signal_instance, is_new).
    """
    now = utc_now()

    if existing:
        existing.title = title
        existing.summary = summary
        existing.severity = severity
        existing.score = score or existing.score
        existing.company_id = company_id or existing.company_id
        existing.person_id = person_id
        existing.opportunity_id = opportunity_id or existing.opportunity_id
        existing.engagement_id = engagement_id or existing.engagement_id
        existing.metadata_payload = metadata_payload or {}
        existing.activity_id = activity_id or existing.activity_id
        existing.detected_at = now
        existing.updated_at = now
        if expires_at:
            existing.expires_at = expires_at
        return existing, False

    new_sig = DetectedSignal(
        signal_id=signal_id,
        company_id=company_id,
        person_id=person_id,
        opportunity_id=opportunity_id,
        engagement_id=engagement_id,
        activity_id=activity_id,
        status="active",
        severity=severity,
        score=score,
        title=title,
        summary=summary,
        metadata_payload=metadata_payload or {},
        detected_at=now,
        expires_at=expires_at,
    )
    db.add(new_sig)
    await db.flush()
    return new_sig, True
