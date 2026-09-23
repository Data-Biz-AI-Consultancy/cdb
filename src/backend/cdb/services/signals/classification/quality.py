"""
cdb.services.signals.classification.quality

Source data quality validation, staleness tracking, source reliability tiers,
permission/confidentiality redactions, and insufficient evidence safeguards.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from enum import StrEnum
from typing import Any


class SourceReliability(StrEnum):
    HIGH = "high"  # Direct verified sync, signed contracts, verified CRM entities
    MEDIUM = "medium"  # Touchpoint notes, inbound messages, structured company enrichment
    LOW = "low"  # Uncorroborated single keyword, fuzzy/heuristic text pattern
    RESTRICTED = "restricted"  # Restricted / confidential access boundary


class DataQualityFlag(StrEnum):
    STALE_SOURCE = "stale_source"
    MISSING_ATTRIBUTES = "missing_attributes"
    SOURCE_UNAVAILABLE = "source_unavailable"
    LOW_RELIABILITY_SOURCE = "low_reliability_source"
    RESTRICTED_DATA = "restricted_data"
    UNVERIFIED_MATCH = "unverified_match"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


# Hard minimum threshold below which signals are strictly suppressed
SUPPRESSION_CONFIDENCE_FLOOR = Decimal("0.30")
# Threshold below which signals receive a disclosure warning
QUALITY_WARNING_THRESHOLD = Decimal("0.65")


@dataclass
class DataQualityAssessment:
    source_reliability: SourceReliability
    data_quality_flags: list[str] = field(default_factory=list)
    is_suppressed: bool = False
    has_quality_warning: bool = False
    disclosure_notes: list[str] = field(default_factory=list)
    processed_excerpt: str | None = None
    confidence_penalty: Decimal = Decimal("0.00")

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_reliability": self.source_reliability.value,
            "data_quality_flags": self.data_quality_flags,
            "is_suppressed": self.is_suppressed,
            "has_quality_warning": self.has_quality_warning,
            "disclosure_notes": self.disclosure_notes,
            "processed_excerpt": self.processed_excerpt,
            "confidence_penalty": float(self.confidence_penalty),
        }


def evaluate_source_data_quality(
    signal_id: str,
    days_elapsed: int | None = None,
    max_fresh_days: int = 60,
    has_company: bool = True,
    has_contact_role: bool = True,
    is_connector_active: bool = True,
    is_confidential: bool = False,
    raw_excerpt: str | None = None,
    confidence_score: Decimal | float | int = Decimal("1.00"),
    source_reliability: SourceReliability | str | None = None,
) -> DataQualityAssessment:
    """
    Evaluates source reliability, staleness, missing attributes, confidentiality restrictions,
    and calculates evidence sufficiency and suppression decisions.
    """
    flags: list[str] = []
    notes: list[str] = []
    penalty = Decimal("0.00")
    score = Decimal(str(confidence_score))

    # Resolve initial source reliability
    if isinstance(source_reliability, str):
        try:
            rel = SourceReliability(source_reliability)
        except ValueError:
            rel = SourceReliability.MEDIUM
    elif isinstance(source_reliability, SourceReliability):
        rel = source_reliability
    else:
        # Default heuristics per signal type
        if signal_id in ("expiring_contract", "dormant_strategic_account"):
            rel = SourceReliability.HIGH
        elif signal_id in ("unanswered_conversation", "hiring_funding_event", "competitor_signal"):
            rel = SourceReliability.MEDIUM
        else:
            rel = SourceReliability.MEDIUM

    processed_excerpt = raw_excerpt

    # 1. Check Confidentiality / Permissions
    if is_confidential:
        rel = SourceReliability.RESTRICTED
        flags.append(DataQualityFlag.RESTRICTED_DATA.value)
        notes.append("Source evidence contains confidential context; sensitive excerpt is redacted")
        if processed_excerpt:
            processed_excerpt = "[REDACTED - Confidential Context]"

    # 2. Check Connector / Upstream Availability
    if not is_connector_active:
        flags.append(DataQualityFlag.SOURCE_UNAVAILABLE.value)
        notes.append("Upstream data source connector is unavailable or disconnected")
        rel = SourceReliability.LOW
        penalty += Decimal("0.35")

    # 3. Check Staleness against TTL
    if days_elapsed is not None and days_elapsed > max_fresh_days:
        flags.append(DataQualityFlag.STALE_SOURCE.value)
        notes.append(
            f"Source data is {days_elapsed} days old (exceeds {max_fresh_days}d freshness SLA)"
        )
        penalty += Decimal("0.20")

    # 4. Check Missing Attributes
    if not has_company:
        flags.append(DataQualityFlag.MISSING_ATTRIBUTES.value)
        notes.append("Supporting evidence lacks verified client account attribution")
        penalty += Decimal("0.30")

    if not has_contact_role and signal_id in ("unanswered_conversation", "leadership_change"):
        flags.append(DataQualityFlag.MISSING_ATTRIBUTES.value)
        notes.append("Counterparty lacks verified executive title or organization role")
        penalty += Decimal("0.15")

    # 5. Check Low Source Reliability
    if rel == SourceReliability.LOW:
        if DataQualityFlag.LOW_RELIABILITY_SOURCE.value not in flags:
            flags.append(DataQualityFlag.LOW_RELIABILITY_SOURCE.value)
        notes.append("Source data reliability is rated LOW (unverified heuristic pattern)")
        penalty += Decimal("0.25")

    # Adjust score with penalty
    effective_score = max(Decimal("0.00"), score - penalty)

    # 6. Check Insufficient Evidence & Suppression Decision
    is_suppressed = False
    if effective_score < SUPPRESSION_CONFIDENCE_FLOOR:
        is_suppressed = True
        flags.append(DataQualityFlag.INSUFFICIENT_EVIDENCE.value)
        notes.append(
            f"Signal suppressed: composite score ({effective_score:.2f}) is below minimum quality floor ({SUPPRESSION_CONFIDENCE_FLOOR})"
        )
    elif not is_connector_active and not has_company:
        is_suppressed = True
        flags.append(DataQualityFlag.INSUFFICIENT_EVIDENCE.value)
        notes.append(
            "Signal suppressed: fatal missing account attribution on unavailable connector"
        )

    has_quality_warning = (
        len(flags) > 0
        or effective_score < QUALITY_WARNING_THRESHOLD
        or rel in (SourceReliability.LOW, SourceReliability.RESTRICTED)
    )

    return DataQualityAssessment(
        source_reliability=rel,
        data_quality_flags=list(dict.fromkeys(flags)),
        is_suppressed=is_suppressed,
        has_quality_warning=has_quality_warning,
        disclosure_notes=list(dict.fromkeys(notes)),
        processed_excerpt=processed_excerpt,
        confidence_penalty=penalty,
    )
