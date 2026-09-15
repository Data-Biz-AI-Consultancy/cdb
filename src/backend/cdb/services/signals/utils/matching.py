"""
cdb.services.signals.utils.matching

Active signal matching and deduplication lookup utilities.
"""

from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.signal import DetectedSignal


async def find_existing_active_signal(
    db: AsyncSession,
    signal_id: str,
    company_id: Any | None = None,
    person_id: Any | None = None,
    opportunity_id: Any | None = None,
    engagement_id: Any | None = None,
    activity_id: Any | None = None,
) -> DetectedSignal | None:
    """
    Finds an existing active or acknowledged signal for the exact target entity scope
    to prevent duplicate signal generation.
    """
    stmt = select(DetectedSignal).where(
        DetectedSignal.signal_id == signal_id,
        DetectedSignal.status.in_(["active", "acknowledged"]),
    )

    if person_id and signal_id in ("unanswered_conversation", "leadership_change"):
        stmt = stmt.where(DetectedSignal.person_id == person_id)
        if company_id:
            stmt = stmt.where(
                or_(DetectedSignal.company_id == company_id, DetectedSignal.company_id.is_(None))
            )
    elif engagement_id:
        stmt = stmt.where(DetectedSignal.engagement_id == engagement_id)
    elif opportunity_id:
        stmt = stmt.where(DetectedSignal.opportunity_id == opportunity_id)
    elif company_id:
        stmt = stmt.where(DetectedSignal.company_id == company_id)
    elif activity_id:
        stmt = stmt.where(DetectedSignal.activity_id == activity_id)
    elif person_id:
        stmt = stmt.where(DetectedSignal.person_id == person_id)

    return (await db.execute(stmt)).scalars().first()
