"""
cdb.services.signals.detectors.dormant

Detects dormant strategic accounts: companies with past signed contracts,
closed-won deals, or strategic tags that have had no recorded touchpoints for > 60 days.
"""

import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.signal import DetectedSignal
from cdb.services.signals.detectors.dormant.signal import create_dormant_signal
from cdb.services.signals.utils import (
    days_between,
    fetch_latest_company_activity,
    get_strategic_companies,
)

__all__ = ["detect_dormant_strategic_accounts", "create_dormant_signal"]


async def detect_dormant_strategic_accounts(
    db: AsyncSession, now: datetime.datetime
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects dormant strategic accounts with past contracts, closed-won deals,
    or strategic tags that have had no touchpoints in > 60 days.
    """
    companies = await get_strategic_companies(db)
    results: list[tuple[DetectedSignal, bool]] = []

    for comp in companies:
        last_act = await fetch_latest_company_activity(db, comp.id)
        days_inactive = days_between(last_act.occurred_at if last_act else None, now, default=180)
        if last_act and days_inactive < 60:
            continue  # Active, not dormant

        res = await create_dormant_signal(db, comp, last_act, days_inactive)
        results.append(res)

    return results
