"""
cdb.services.signals.detectors.leadership.arrivals

Detects new executive arrivals matching executive title patterns.
"""

import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.signal import DetectedSignal
from cdb.services.signals.detectors.leadership.signal import create_leadership_signal
from cdb.services.signals.patterns import EXCLUDE_EXECUTIVE_TITLE_REGEX, EXECUTIVE_TITLE_REGEX


async def detect_leadership_arrivals(
    db: AsyncSession,
    now: datetime.datetime,
    cutoff_date: datetime.date,
) -> list[tuple[DetectedSignal, bool]]:
    """Detects new executive arrivals within the lookback window."""
    stmt = (
        select(PersonCompanyRelationship)
        .where(
            PersonCompanyRelationship.is_current.is_(True),
            PersonCompanyRelationship.started_at >= cutoff_date,
        )
        .order_by(PersonCompanyRelationship.started_at.desc())
    )
    arrivals = (await db.execute(stmt)).scalars().all()

    results: list[tuple[DetectedSignal, bool]] = []
    for rel in arrivals:
        if not rel.title or not EXECUTIVE_TITLE_REGEX.search(rel.title):
            continue
        if EXCLUDE_EXECUTIVE_TITLE_REGEX.search(rel.title):
            continue
        res = await create_leadership_signal(db, rel, "new_hire", rel.started_at, now)
        results.append(res)
    return results
