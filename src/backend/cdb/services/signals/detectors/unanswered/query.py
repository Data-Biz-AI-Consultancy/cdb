"""
cdb.services.signals.detectors.unanswered.query

Queries candidate inbound conversation activities awaiting response.
"""

import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity


async def fetch_candidate_unanswered_activities(
    db: AsyncSession,
    cutoff_3d: datetime.datetime,
    lookback_cutoff: datetime.datetime,
) -> dict[Any, Activity]:
    """
    Fetches the most recent inbound communication per person within the SLA window.
    """
    stmt = (
        select(Activity)
        .where(
            Activity.type.in_(["conversation", "message", "linkedin_message", "email", "whatsapp"]),
            Activity.person_id.is_not(None),
            Activity.occurred_at <= cutoff_3d,
            Activity.occurred_at >= lookback_cutoff,
        )
        .order_by(Activity.occurred_at.desc())
    )
    activities = (await db.execute(stmt)).scalars().all()

    person_latest: dict[Any, Activity] = {}
    for act in activities:
        if act.person_id not in person_latest:
            person_latest[act.person_id] = act

    return person_latest
