"""
cdb.services.signals.utils.upsert

Signal upsert and deduplication coordinator.
Orchestrates account resolution, metadata enrichment, deduplication lookup,
record persistence, and person linking.
"""

import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.signal import DetectedSignal
from cdb.services.signals.utils.account import resolve_account_for_signal
from cdb.services.signals.utils.enrichment import (
    enrich_company_context,
    sanitize_target_persons,
)
from cdb.services.signals.utils.linking import link_signal_persons
from cdb.services.signals.utils.matching import find_existing_active_signal
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
    metadata_payload: dict[str, Any] | None = None,
    expires_at: datetime.datetime | None = None,
) -> tuple[DetectedSignal, bool]:
    """
    Inserts a new detected signal or updates an existing active/acknowledged signal
    for the exact target entity to avoid spamming duplicates.
    Guarantees account resolution by populating company_id and company context.
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

    # 4. Look up existing active/acknowledged signal
    existing = await find_existing_active_signal(
        db,
        signal_id=signal_id,
        company_id=company_id,
        person_id=person_id,
        opportunity_id=opportunity_id,
        engagement_id=engagement_id,
        activity_id=activity_id,
    )

    # 5. Persist or update signal record
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
        score=score,
        metadata_payload=metadata_payload,
        expires_at=expires_at,
    )

    # 6. Link all connected non-internal persons
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
