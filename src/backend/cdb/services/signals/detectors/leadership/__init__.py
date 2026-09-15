"""
cdb.services.signals.detectors.leadership

Detector package for executive departures and new leadership arrivals.
"""

import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.signal import DetectedSignal
from cdb.services.signals.detectors.leadership.arrivals import detect_leadership_arrivals
from cdb.services.signals.detectors.leadership.departures import detect_leadership_departures
from cdb.services.signals.detectors.leadership.signal import create_leadership_signal

__all__ = [
    "detect_leadership_changes",
    "detect_leadership_departures",
    "detect_leadership_arrivals",
    "create_leadership_signal",
]


async def detect_leadership_changes(
    db: AsyncSession, now: datetime.datetime, lookback_days: int = 90
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects executive departures or new executive roles within the lookback window.
    """
    cutoff_date = (now - datetime.timedelta(days=lookback_days)).date()
    departures = await detect_leadership_departures(db, now, cutoff_date)
    arrivals = await detect_leadership_arrivals(db, now, cutoff_date)
    return departures + arrivals
