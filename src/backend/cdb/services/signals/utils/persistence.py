"""
cdb.services.signals.utils.persistence

Database persistence and record mutation utilities for detected signals.
Handles alert deduplication, fingerprint comparison, suppression of dismissed/resolved signals,
snooze expiry evaluation, and re-alerting when new evidence arrives.
"""

import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.base import utc_now
from cdb.models.signal import DetectedSignal


async def persist_signal_record(
    db: AsyncSession,
    existing: DetectedSignal | None,
    signal_id: str,
    title: str,
    severity: str,
    summary: str | None = None,
    company_id: Any | None = None,
    person_id: Any | None = None,
    opportunity_id: Any | None = None,
    engagement_id: Any | None = None,
    activity_id: Any | None = None,
    score: Decimal | None = None,
    evidence_fingerprint: str | None = None,
    metadata_payload: dict[str, Any] | None = None,
    expires_at: datetime.datetime | None = None,
) -> tuple[DetectedSignal, bool]:
    """
    Persists or updates a detected signal record with robust lifecycle controls:
    - Active / Acknowledged / Actioned: updates details in-place.
    - Snoozed: keeps snoozed if unexpired; auto-wakes to active if snooze duration elapsed.
    - Dismissed / Resolved: suppresses re-alerting if evidence fingerprint is identical;
      reopens to active if new meaningful evidence arrives.
    - New: creates a new DetectedSignal record.

    Returns (signal_instance, is_new).
    """
    now = utc_now()
    metadata_payload = metadata_payload or {}

    if existing:
        current_status = existing.status

        # 1. Handle Snoozed Signal Evaluation
        if current_status == "snoozed":
            if existing.snoozed_until and now < existing.snoozed_until:
                # Still within snooze window -> suppress re-alert, preserve snoozed status
                existing.metadata_payload = metadata_payload
                existing.evidence_fingerprint = (
                    evidence_fingerprint or existing.evidence_fingerprint
                )
                existing.updated_at = now
                return existing, False
            else:
                # Snooze duration elapsed -> auto-wake to active
                existing.status = "active"
                existing.snoozed_until = None
                existing.reopen_count = (existing.reopen_count or 0) + 1
                existing.last_reopened_at = now
                metadata_payload["auto_unsnoozed"] = True
                metadata_payload["reopened_reason"] = "Snooze window expired"

        # 2. Handle Dismissed / Resolved Signal Suppression vs Re-alerting
        elif current_status in ("dismissed", "resolved"):
            # Check if evidence fingerprint matches previous resolution
            if (
                evidence_fingerprint
                and existing.evidence_fingerprint
                and evidence_fingerprint == existing.evidence_fingerprint
            ):
                # Meaningless/repeated evidence -> SUPPRESS RE-ALERT
                return existing, False

            # If evidence has meaningfully changed -> RE-ALERT
            existing.status = "active"
            existing.reopen_count = (existing.reopen_count or 0) + 1
            existing.last_reopened_at = now
            metadata_payload["reopened_from"] = current_status
            metadata_payload["reopened_reason"] = "New evidence detected"

        # 3. Update fields in-place for active/reopened signals
        existing.title = title
        existing.summary = summary
        existing.severity = severity
        existing.score = score or existing.score
        existing.company_id = company_id or existing.company_id
        existing.person_id = person_id
        existing.opportunity_id = opportunity_id or existing.opportunity_id
        existing.engagement_id = engagement_id or existing.engagement_id
        existing.activity_id = activity_id or existing.activity_id
        existing.evidence_fingerprint = evidence_fingerprint or existing.evidence_fingerprint
        existing.metadata_payload = metadata_payload
        existing.detected_at = now
        existing.updated_at = now
        if expires_at:
            existing.expires_at = expires_at
        return existing, False

    # 4. Insert Brand-New Detected Signal
    new_sig = DetectedSignal(
        signal_id=signal_id,
        company_id=company_id,
        person_id=person_id,
        opportunity_id=opportunity_id,
        engagement_id=engagement_id,
        activity_id=activity_id,
        status="active",
        severity=severity,
        score=score,
        evidence_fingerprint=evidence_fingerprint,
        title=title,
        summary=summary,
        metadata_payload=metadata_payload,
        reopen_count=0,
        detected_at=now,
        expires_at=expires_at,
    )
    db.add(new_sig)
    await db.flush()
    return new_sig, True
