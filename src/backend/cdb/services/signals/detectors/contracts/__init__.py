"""
cdb.services.signals.detectors.contracts

Detects signed active engagements whose expected_end_date is within 60 days,
signalling an expiring contract that requires renewal or extension action.
"""

import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.signal import DetectedSignal
from cdb.services.signals.detectors.contracts.query import fetch_expiring_engagements
from cdb.services.signals.detectors.contracts.signal import create_contract_signal

__all__ = [
    "detect_expiring_contracts",
    "fetch_expiring_engagements",
    "create_contract_signal",
]


async def detect_expiring_contracts(
    db: AsyncSession, now: datetime.datetime
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects signed active engagements where expected_end_date is within 60 days.
    """
    today = now.date()
    engagements = await fetch_expiring_engagements(db, today)

    results: list[tuple[DetectedSignal, bool]] = []
    for eng in engagements:
        res = await create_contract_signal(db, eng, today)
        results.append(res)

    return results
