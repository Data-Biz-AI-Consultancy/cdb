"""
cdb.services.signals.classification.evidence

Supporting evidence payload contracts and metadata builders.
"""

from decimal import Decimal
from typing import Any


def build_evidence_payload(
    evidence_type: str,
    source_entity_type: str,
    source_entity_id: str | None,
    occurred_at: str | None,
    days_elapsed: int | None = None,
    excerpt: str | None = None,
    key_metrics: dict[str, Any] | None = None,
    verification_status: str = "verified",
) -> dict[str, Any]:
    """
    Standardized contract for supporting evidence attached to a detected signal.
    """
    return {
        "evidence_type": evidence_type,
        "source_entity_type": source_entity_type,
        "source_entity_id": str(source_entity_id) if source_entity_id else None,
        "occurred_at": occurred_at,
        "days_elapsed": days_elapsed,
        "excerpt": excerpt,
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
