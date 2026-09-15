"""
cdb.services.signals.detectors.unanswered

Detects inbound conversations awaiting a response for > 3 days where the
content signals a competitor mention or a commercial / gig opportunity.
"""

import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.company import Company
from cdb.models.person import Person
from cdb.models.signal import DetectedSignal
from cdb.services.signals.detectors.unanswered.query import fetch_candidate_unanswered_activities
from cdb.services.signals.detectors.unanswered.signal import create_unanswered_signal
from cdb.services.signals.patterns import (
    COMMERCIAL_OPPORTUNITY_REGEX,
    COMPETITOR_REGEX,
    EXCLUDE_CONVERSATION_REGEX,
)
from cdb.services.signals.utils import (
    _resolve_account_for_signal,
    days_between,
    get_activity_searchable_text,
    get_company_display_name,
    get_person_display_name,
    has_newer_outbound_activity,
    is_last_speaker_host,
)

__all__ = [
    "detect_unanswered_conversations",
    "fetch_candidate_unanswered_activities",
    "create_unanswered_signal",
]


async def detect_unanswered_conversations(
    db: AsyncSession, now: datetime.datetime, lookback_days: int = 90
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects inbound messages or communications awaiting outbound response for > 3 days.
    Filters out routine inbox noise by strictly requiring competitor or commercial intent.
    """
    cutoff_3d = now - datetime.timedelta(days=3)
    lookback_cutoff = now - datetime.timedelta(days=lookback_days)

    person_latest = await fetch_candidate_unanswered_activities(db, cutoff_3d, lookback_cutoff)
    results: list[tuple[DetectedSignal, bool]] = []

    for person_id, act in person_latest.items():
        if await has_newer_outbound_activity(db, person_id, act.occurred_at):
            continue
        if is_last_speaker_host(act.raw_content):
            continue

        content = get_activity_searchable_text(act)
        if EXCLUDE_CONVERSATION_REGEX.search(content):
            continue

        comp_match = COMPETITOR_REGEX.search(content)
        opp_match = COMMERCIAL_OPPORTUNITY_REGEX.search(content)
        if not (comp_match or opp_match):
            continue

        person = await db.get(Person, person_id)
        person_name = get_person_display_name(person)

        comp_id = await _resolve_account_for_signal(
            db, company_id=act.company_id, person_id=person_id, activity_id=act.id
        )
        comp = await db.get(Company, comp_id) if comp_id else None
        comp_name = get_company_display_name(comp, default=None)

        days_unanswered = days_between(act.occurred_at, now)
        matched_term = (
            comp_match.group(0)
            if comp_match
            else (opp_match.group(0) if opp_match else "project/gig")
        )

        res = await create_unanswered_signal(
            db,
            act=act,
            person_id=person_id,
            comp_id=comp_id,
            person_name=person_name,
            comp_name=comp_name,
            matched_term=matched_term,
            days_unanswered=days_unanswered,
            is_competitor=bool(comp_match),
        )
        results.append(res)

    return results
