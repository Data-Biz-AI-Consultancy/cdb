"""
cdb.services.signals.detectors.leadership.departures

Detects executive and stakeholder departures from client companies.
"""

import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.signal import DetectedSignal
from cdb.services.signals.detectors.leadership.signal import create_leadership_signal


async def detect_leadership_departures(
    db: AsyncSession,
    now: datetime.datetime,
    cutoff_date: datetime.date,
) -> list[tuple[DetectedSignal, bool]]:
    """Detects executive role departures within the lookback window."""
    stmt = (
        select(PersonCompanyRelationship)
        .where(
            PersonCompanyRelationship.is_current.is_(False),
            PersonCompanyRelationship.ended_at >= cutoff_date,
        )
        .order_by(PersonCompanyRelationship.ended_at.desc())
    )
    departures = (await db.execute(stmt)).scalars().all()

    results: list[tuple[DetectedSignal, bool]] = []
    for rel in departures:
        res = await create_leadership_signal(db, rel, "departure", rel.ended_at, now)
        results.append(res)
    return results
