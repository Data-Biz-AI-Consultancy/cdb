"""
cdb.services.signals.utils.upsert

Signal upsert and deduplication coordinator.
Orchestrates account resolution, metadata enrichment, deterministic evidence fingerprinting,
lifecycle suppression/re-alerting, record persistence, and person linking.
"""

import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import calculate_signal_priority
from cdb.services.signals.utils.account import resolve_account_for_signal
from cdb.services.signals.utils.enrichment import (
    enrich_company_context,
    sanitize_target_persons,
)
from cdb.services.signals.utils.fingerprint import compute_evidence_fingerprint
from cdb.services.signals.utils.linking import link_signal_persons
from cdb.services.signals.utils.matching import find_existing_signal_record
from cdb.services.signals.utils.persistence import persist_signal_record


async def upsert_detected_signal(
    db: AsyncSession,
    signal_id: str,
    title: str,
    severity: str,
    summary: str | None = None,
    company_id: Any | None = None,
    person_id: Any | None = None,
    connected_person_ids: list[Any] | None = None,
    opportunity_id: Any | None = None,
    engagement_id: Any | None = None,
    activity_id: Any | None = None,
    score: Decimal | None = None,
    evidence_fingerprint: str | None = None,
    metadata_payload: dict[str, Any] | None = None,
    expires_at: datetime.datetime | None = None,
) -> tuple[DetectedSignal, bool]:
    """
    Inserts a new detected signal or updates an existing signal for the target entity.
    Guarantees account resolution, deterministic evidence fingerprinting, duplicate suppression,
    snooze handling, and re-alerting.
    Returns (signal_instance, is_new).
    """
    metadata_payload = metadata_payload or {}

    # 1. Guarantee affected account attribution
    if not company_id:
        company_id = await resolve_account_for_signal(
            db,
            company_id=company_id,
            person_id=person_id,
            opportunity_id=opportunity_id,
            engagement_id=engagement_id,
            activity_id=activity_id,
        )

    # 2. Attach rich account supporting context
    metadata_payload = await enrich_company_context(db, company_id, metadata_payload)

    # 3. Protect against internal employee misattribution
    person_roles: dict[str, str] = dict(metadata_payload.get("person_roles") or {})
    person_id, clean_target_ids = await sanitize_target_persons(db, person_id, connected_person_ids)

    # 4. Compute deterministic evidence fingerprint if not provided
    if not evidence_fingerprint:
        evidence_dict = metadata_payload.get("evidence") or {}
        primary_target_id = str(company_id or person_id or engagement_id or opportunity_id or "")
        evidence_fingerprint = compute_evidence_fingerprint(
            signal_id=signal_id,
            target_id=primary_target_id,
            evidence=evidence_dict,
        )

    # 5. Calculate composite Priority Score & Business Impact Breakdown
    evidence_obj = metadata_payload.get("evidence") or {}
    evidence_dict = evidence_obj if isinstance(evidence_obj, dict) else {}
    company_tier = metadata_payload.get("company_tier") or metadata_payload.get("tier")
    company_segment = metadata_payload.get("company_segment") or metadata_payload.get("segment")
    is_client = bool(metadata_payload.get("is_client", False))
    role = (
        metadata_payload.get("person_role")
        or (person_roles.get(str(person_id)) if person_id else None)
        or evidence_dict.get("relationship_context", {}).get("role")
    )
    days_elapsed = (
        metadata_payload.get("days_inactive")
        or metadata_payload.get("days_unanswered")
        or evidence_dict.get("days_elapsed")
    )
    days_remaining = metadata_payload.get("days_remaining") or evidence_dict.get(
        "key_metrics", {}
    ).get("days_remaining")
    commercial_value = (
        metadata_payload.get("commercial_value")
        or evidence_dict.get("commercial_context", {}).get("rate_value")
        or (score if score and score > 1.0 else None)
    )

    priority_res = calculate_signal_priority(
        signal_id=signal_id,
        severity=severity,
        company_tier=company_tier,
        is_client=is_client,
        company_segment=company_segment,
        role=role,
        connected_persons_count=len(clean_target_ids) if clean_target_ids else 0,
        is_champion=bool(metadata_payload.get("is_champion", False)),
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        commercial_value=commercial_value,
        metadata_payload=metadata_payload,
    )

    priority_score = Decimal(str(priority_res.total_score))
    metadata_payload["priority_tier"] = priority_res.priority_tier.value
    metadata_payload["effective_polarity"] = priority_res.effective_polarity
    metadata_payload["priority_breakdown"] = priority_res.model_dump()
    if score and score <= 1.0:
        metadata_payload.setdefault("confidence_score", float(score))

    # 6. Look up existing signal across all lifecycle states
    existing = await find_existing_signal_record(
        db,
        signal_id=signal_id,
        company_id=company_id,
        person_id=person_id,
        opportunity_id=opportunity_id,
        engagement_id=engagement_id,
        activity_id=activity_id,
    )

    # 7. Persist, update, suppress, or re-alert signal record
    target_sig, is_new = await persist_signal_record(
        db,
        existing=existing,
        signal_id=signal_id,
        title=title,
        severity=severity,
        summary=summary,
        company_id=company_id,
        person_id=person_id,
        opportunity_id=opportunity_id,
        engagement_id=engagement_id,
        activity_id=activity_id,
        score=priority_score,
        evidence_fingerprint=evidence_fingerprint,
        metadata_payload=metadata_payload,
        expires_at=expires_at,
    )

    # 7. Link all connected non-internal persons
    if target_sig:
        await link_signal_persons(
            db,
            detected_signal_id=target_sig.id,
            clean_target_ids=clean_target_ids,
            primary_person_id=person_id,
            person_roles=person_roles,
        )

    return target_sig, is_new


# Backward-compatible private alias
_upsert_detected_signal = upsert_detected_signal
