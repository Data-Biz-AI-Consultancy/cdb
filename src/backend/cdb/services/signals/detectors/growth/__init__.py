"""
cdb.services.signals.detectors.growth

Detector package for hiring expansion and funding round events.
Combines unstructured interaction analysis with structured account enrichment.
"""

import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.signal import DetectedSignal
from cdb.services.signals.detectors.growth.activities import detect_growth_from_activities
from cdb.services.signals.detectors.growth.enrichment import detect_growth_from_enrichment

__all__ = [
    "detect_hiring_funding_events",
    "detect_growth_from_activities",
    "detect_growth_from_enrichment",
]


async def detect_hiring_funding_events(
    db: AsyncSession, now: datetime.datetime, lookback_days: int = 90
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects mentions of funding rounds or hiring acceleration across:
    1. Unstructured interactions and meeting debriefs (Activity records within lookback window).
    2. Structured account enrichment data (Company.attributes funding and headcount signals).
    """
    cutoff = now - datetime.timedelta(days=lookback_days)
    seen_companies: set[Any] = set()

    activity_signals = await detect_growth_from_activities(db, now, cutoff, seen_companies)
    enrichment_signals = await detect_growth_from_enrichment(db, now, seen_companies)

    return activity_signals + enrichment_signals
