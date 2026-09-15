"""
cdb.services.signals.detectors.contracts.query

Queries signed active engagements approaching contract end date.
"""

import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.engagement import Engagement


async def fetch_expiring_engagements(
    db: AsyncSession,
    today: datetime.date,
    forward_days: int = 60,
    past_days: int = 14,
) -> list[Engagement]:
    """Fetches signed, active engagements whose expected_end_date is within the expiry window."""
    cutoff_forward = today + datetime.timedelta(days=forward_days)
    cutoff_past = today - datetime.timedelta(days=past_days)

    stmt = select(Engagement).where(
        Engagement.contract_status == "signed",
        Engagement.status.in_(["active", "in_delivery"]),
        Engagement.expected_end_date.is_not(None),
        Engagement.expected_end_date <= cutoff_forward,
        Engagement.expected_end_date >= cutoff_past,
    )
    return list((await db.execute(stmt)).scalars().all())
