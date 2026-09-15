"""
cdb.services.signals.detectors.competitors.signal

Builds and persists competitor threat signals.
"""

import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import (
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
)
from cdb.services.signals.detectors.competitors.constants import NAMED_CONSULTANCIES
from cdb.services.signals.utils import (
    _upsert_detected_signal,
    days_between,
    extract_activity_persons,
)


async def create_competitor_signal(
    db: AsyncSession,
    act: Activity,
    opp_id: Any | None,
    resolved_comp_id: Any | None,
    matched_phrase: str,
    now: datetime.datetime,
) -> tuple[DetectedSignal, bool]:
    """Constructs evidence and metadata payload, then persists a competitor threat signal."""
    matched_lower = matched_phrase.lower()
    is_named = any(name in matched_lower for name in NAMED_CONSULTANCIES)

    days_ago = days_between(act.occurred_at, now)
    conf_val = Decimal("0.85") if is_named else Decimal("0.60")
    flags: list[str] = []
    if days_ago > 60:
        conf_val -= Decimal("0.15")
        flags.append(
            f"Mention occurred {days_ago} days ago; competitor evaluation may have concluded"
        )

    conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(
        conf_val, ambiguity_flags=flags
    )

    evidence = build_evidence_payload(
        evidence_type="text_pattern",
        source_entity_type="activity",
        source_entity_id=str(act.id),
        occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
        days_elapsed=days_ago,
        excerpt=f"Competitor phrase '{matched_phrase}' detected in interaction: {act.title or act.summary or ''}",
        key_metrics={"matched_phrase": matched_phrase, "is_named_competitor": is_named},
        verification_status="verified" if is_named else "probable",
    )

    title = f"Competitor Threat: '{matched_phrase}' detected"
    summary = (
        f"Interaction on {act.occurred_at.strftime('%Y-%m-%d')} indicated competitor or alternative evaluation: "
        f"'{matched_phrase}'. Recommend activating competitive battlecard."
    )

    connected_pids, _, suggested = extract_activity_persons(act)

    meta = build_signal_meta(
        conf_score,
        conf_tier,
        is_uncertain,
        uncert_reasons,
        evidence,
        matched_phrase=matched_phrase,
        activity_occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
    )
    if suggested:
        meta["suggested_persons"] = suggested

    return await _upsert_detected_signal(
        db,
        signal_id="competitor_signal",
        opportunity_id=opp_id,
        company_id=resolved_comp_id,
        person_id=act.person_id,
        connected_person_ids=connected_pids,
        activity_id=act.id,
        title=title,
        summary=summary,
        severity="high",
        score=conf_score,
        metadata_payload=meta,
    )
