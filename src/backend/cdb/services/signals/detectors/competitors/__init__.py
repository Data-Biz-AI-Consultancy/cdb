"""
cdb.services.signals.detectors.competitors

Detects competitor mentions or bake-off situations in recent meeting debriefs
or deal notes, guaranteeing affected account resolution via Opportunity,
Engagement, or Person entity traversal.
"""

import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.engagement import Engagement
from cdb.models.signal import DetectedSignal
from cdb.services.signals.detectors.competitors.constants import (
    _NAMED_CONSULTANCIES,
    NAMED_CONSULTANCIES,
)
from cdb.services.signals.detectors.competitors.signal import create_competitor_signal
from cdb.services.signals.patterns import COMPETITOR_REGEX
from cdb.services.signals.utils import (
    _resolve_account_for_signal,
    get_activity_searchable_text,
)

__all__ = [
    "detect_competitor_signals",
    "create_competitor_signal",
    "NAMED_CONSULTANCIES",
    "_NAMED_CONSULTANCIES",
]


async def detect_competitor_signals(
    db: AsyncSession, now: datetime.datetime, lookback_days: int = 90
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects competitor mentions or bake-offs in recent meeting debriefs or deal notes.
    Guarantees affected account resolution via Opportunity, Engagement, or Person.
    """
    cutoff = now - datetime.timedelta(days=lookback_days)

    stmt = (
        select(Activity).where(Activity.occurred_at >= cutoff).order_by(Activity.occurred_at.desc())
    )
    activities = (await db.execute(stmt)).scalars().all()

    results: list[tuple[DetectedSignal, bool]] = []
    seen_opps: set[Any] = set()

    for act in activities:
        content = get_activity_searchable_text(act)
        comp_match = COMPETITOR_REGEX.search(content)
        if not comp_match:
            continue

        matched_phrase = comp_match.group(0)

        # Check if activity has an opportunity via engagement
        opp_id = None
        if act.engagement_id:
            eng = await db.get(Engagement, act.engagement_id)
            opp_id = eng.opportunity_id if eng else None

        # Resolve affected company
        resolved_comp_id = await _resolve_account_for_signal(
            db,
            company_id=act.company_id,
            opportunity_id=opp_id,
            engagement_id=act.engagement_id,
            person_id=act.person_id,
            activity_id=act.id,
        )

        target_key = opp_id or resolved_comp_id or act.person_id
        if target_key in seen_opps:
            continue
        seen_opps.add(target_key)

        res = await create_competitor_signal(
            db=db,
            act=act,
            opp_id=opp_id,
            resolved_comp_id=resolved_comp_id,
            matched_phrase=matched_phrase,
            now=now,
        )
        results.append(res)

    return results
