"""
cdb.services.signals.classification.evidence

Supporting evidence payload contracts and metadata builders.
"""

from decimal import Decimal
from enum import StrEnum
from typing import Any


class EvidenceStatus(StrEnum):
    FRESH = "fresh"
    STALE = "stale"
    INCOMPLETE = "incomplete"
    CONFLICTING = "conflicting"
    UNVERIFIED = "unverified"


def determine_evidence_status(
    days_elapsed: int | None = None,
    max_fresh_days: int = 60,
    is_uncertain: bool = False,
    has_conflict: bool = False,
    missing_required: bool = False,
    verification_status: str = "verified",
) -> tuple[str, list[str]]:
    """
    Evaluates evidence freshness, completeness, and validity based on temporal thresholds
    and corroboration quality.
    """
    notes: list[str] = []
    if has_conflict:
        notes.append("Opposing commercial polarity signals detected on this entity")
        return EvidenceStatus.CONFLICTING.value, notes
    if missing_required:
        notes.append("Supporting evidence lacks complete counterparty or account attribution")
        return EvidenceStatus.INCOMPLETE.value, notes
    if verification_status in ("unverified", "unreliable"):
        notes.append("Supporting evidence contains unverified or ambiguous match terms")
        return EvidenceStatus.UNVERIFIED.value, notes
    if days_elapsed is not None and days_elapsed > max_fresh_days:
        notes.append(
            f"Evidence is {days_elapsed} days old (exceeds {max_fresh_days}d freshness window)"
        )
        return EvidenceStatus.STALE.value, notes
    if is_uncertain:
        notes.append("Evidence confidence score requires verification review")
        return EvidenceStatus.UNVERIFIED.value, notes

    return EvidenceStatus.FRESH.value, notes


def build_evidence_payload(
    evidence_type: str,
    source_entity_type: str,
    source_entity_id: str | None,
    occurred_at: str | None,
    days_elapsed: int | None = None,
    excerpt: str | None = None,
    key_metrics: dict[str, Any] | None = None,
    verification_status: str = "verified",
    why_it_matters_now: str | None = None,
    trigger_event_title: str | None = None,
    evidence_status: str | None = None,
    evidence_notes: list[str] | None = None,
    commercial_context: dict[str, Any] | None = None,
    relationship_context: dict[str, Any] | None = None,
    source_display: str | None = None,
) -> dict[str, Any]:
    """
    Standardized contract for supporting evidence attached to a detected signal.
    """
    notes = list(evidence_notes) if evidence_notes else []

    if not evidence_status:
        calculated_status, calc_notes = determine_evidence_status(
            days_elapsed=days_elapsed,
            verification_status=verification_status,
        )
        evidence_status = calculated_status
        for note in calc_notes:
            if note not in notes:
                notes.append(note)

    return {
        "evidence_type": evidence_type,
        "source_entity_type": source_entity_type,
        "source_entity_id": str(source_entity_id) if source_entity_id else None,
        "source_display": source_display,
        "trigger_event_title": trigger_event_title,
        "why_it_matters_now": why_it_matters_now,
        "occurred_at": occurred_at,
        "days_elapsed": days_elapsed,
        "excerpt": excerpt,
        "evidence_status": evidence_status,
        "evidence_notes": notes,
        "commercial_context": commercial_context or {},
        "relationship_context": relationship_context or {},
        "key_metrics": key_metrics or {},
        "verification_status": verification_status,
    }


def build_signal_meta(
    conf_score: Decimal,
    conf_tier: Any,
    is_uncertain: bool,
    uncert_reasons: list[str],
    evidence: dict[str, Any],
    **extra: Any,
) -> dict[str, Any]:
    """
    Builds the standard signal metadata payload merging the fixed confidence fields,
    the evidence payload, and any domain-specific extra keys provided by the caller.
    """
    return {
        "confidence_score": float(conf_score),
        "confidence_tier": conf_tier.value if hasattr(conf_tier, "value") else str(conf_tier),
        "is_uncertain": is_uncertain,
        "uncertainty_reasons": uncert_reasons,
        "evidence": evidence,
        **extra,
    }
