"""
cdb.services.signals.detectors.competitors

Detects competitor mentions or bake-off situations in recent meeting debriefs
or deal notes, guaranteeing affected account resolution via Opportunity,
Engagement, or Person entity traversal.
"""

import datetime
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.engagement import Engagement
from cdb.models.signal import DetectedSignal
from cdb.services.signals._helpers import _resolve_account_for_signal, _upsert_detected_signal
from cdb.services.signals.classification import assess_confidence, build_evidence_payload
from cdb.services.signals.patterns import COMPETITOR_REGEX

_NAMED_CONSULTANCIES: frozenset[str] = frozenset(
    {"slalom", "thoughtworks", "accenture", "deloitte", "competing proposal", "bake-off", "rfp"}
)


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
        content = f"{act.title or ''} {act.summary or ''} {act.raw_content or ''}"
        comp_match = COMPETITOR_REGEX.search(content)
        if not comp_match:
            continue

        matched_phrase = comp_match.group(0)

        # Check if activity has an opportunity or company
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

        matched_lower = matched_phrase.lower()
        is_named = any(name in matched_lower for name in _NAMED_CONSULTANCIES)

        act_dt = (
            act.occurred_at
            if act.occurred_at.tzinfo
            else act.occurred_at.replace(tzinfo=datetime.UTC)
        )
        days_ago = (now - act_dt).days
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

        meta: dict[str, Any] = {
            "matched_phrase": matched_phrase,
            "activity_occurred_at": act.occurred_at.isoformat() if act.occurred_at else None,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
        }

        connected_pids: list[Any] = []
        if act.person_id:
            connected_pids.append(act.person_id)
        if act.attributes and isinstance(act.attributes, dict):
            for extra_pid in act.attributes.get("participant_person_ids", []):
                if extra_pid not in connected_pids:
                    connected_pids.append(extra_pid)
            for e in act.attributes.get("entities", []):
                epid = e.get("person_id")
                if epid and not e.get("is_internal"):
                    try:
                        uuid_val = uuid.UUID(epid) if isinstance(epid, str) else epid
                        if uuid_val not in connected_pids:
                            connected_pids.append(uuid_val)
                    except Exception:
                        pass
            if act.attributes.get("suggested_persons"):
                meta["suggested_persons"] = act.attributes.get("suggested_persons")

        res = await _upsert_detected_signal(
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
        results.append(res)

    return results
