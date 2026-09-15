"""
cdb.services.signals.detectors.growth.activities

Detects hiring and funding signals from unstructured Activity interaction notes.
"""

import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import (
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
)
from cdb.services.signals.patterns import FUNDING_REGEX, HIRING_REGEX
from cdb.services.signals.utils import (
    _upsert_detected_signal,
    days_between,
    extract_activity_persons,
    get_activity_searchable_text,
    get_company_display_name,
)


async def detect_growth_from_activities(
    db: AsyncSession,
    now: datetime.datetime,
    cutoff: datetime.datetime,
    seen_companies: set[Any],
) -> list[tuple[DetectedSignal, bool]]:
    """Evaluates unstructured interaction text for funding or hiring keywords."""
    stmt = (
        select(Activity)
        .where(
            Activity.occurred_at >= cutoff,
            Activity.company_id.is_not(None),
        )
        .order_by(Activity.occurred_at.desc())
    )
    activities = (await db.execute(stmt)).scalars().all()
    results: list[tuple[DetectedSignal, bool]] = []

    for act in activities:
        content = get_activity_searchable_text(act)
        funding_match = FUNDING_REGEX.search(content)
        hiring_match = HIRING_REGEX.search(content)

        if not funding_match and not hiring_match:
            continue

        if act.company_id in seen_companies:
            continue
        seen_companies.add(act.company_id)

        company = await db.get(Company, act.company_id)
        comp_name = get_company_display_name(company)
        event_type = "Funding" if funding_match else "Hiring Expansion"
        matched_phrase = (funding_match or hiring_match).group(0)

        days_ago = days_between(act.occurred_at, now)
        conf_val = Decimal("0.80") if funding_match else Decimal("0.65")
        flags: list[str] = []
        if days_ago > 60:
            conf_val -= Decimal("0.20")
            flags.append(f"Event occurred {days_ago} days ago; growth context may have evolved")

        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(
            conf_val, ambiguity_flags=flags
        )

        evidence = build_evidence_payload(
            evidence_type="text_pattern",
            source_entity_type="activity",
            source_entity_id=str(act.id),
            occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
            days_elapsed=days_ago,
            excerpt=f"Matched '{matched_phrase}' in activity: {act.title or act.summary or ''}",
            key_metrics={
                "event_type": event_type.lower(),
                "matched_phrase": matched_phrase,
                "account_name": comp_name,
            },
            verification_status="verified" if not is_uncertain else "probable",
        )

        title = f"{event_type} Signal: {comp_name} ('{matched_phrase}')"
        summary = (
            f"Interaction on {act.occurred_at.strftime('%Y-%m-%d')} highlighted a growth/capital event: "
            f"'{matched_phrase}'. Potential advisory or capability acceleration opportunity."
        )

        connected_pids, person_roles, suggested = extract_activity_persons(act)
        meta = build_signal_meta(
            conf_score,
            conf_tier,
            is_uncertain,
            uncert_reasons,
            evidence,
            event_type=event_type.lower(),
            matched_phrase=matched_phrase,
            activity_date=act.occurred_at.isoformat() if act.occurred_at else None,
            company_name=comp_name,
            person_roles=person_roles,
            suggested_persons=suggested,
        )

        res = await _upsert_detected_signal(
            db,
            signal_id="hiring_funding_event",
            company_id=act.company_id,
            person_id=act.person_id,
            connected_person_ids=connected_pids,
            activity_id=act.id,
            title=title,
            summary=summary,
            severity="medium",
            score=conf_score,
            metadata_payload=meta,
        )
        results.append(res)

    return results
