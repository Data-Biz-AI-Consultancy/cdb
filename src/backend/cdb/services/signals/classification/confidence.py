"""
cdb.services.signals.classification.confidence

Confidence thresholding, scoring heuristics, and uncertainty identification.
"""

from decimal import Decimal
from enum import StrEnum


class SignalConfidenceTier(StrEnum):
    HIGH = "high"  # >= 0.80: Verified structured data
    MEDIUM = "medium"  # 0.50 - 0.79: Probable text/role match
    LOW = "low"  # < 0.50: Ambiguous or stale, flagged as uncertain


# Threshold constants
CONFIDENCE_HIGH_THRESHOLD = Decimal("0.80")
CONFIDENCE_MEDIUM_THRESHOLD = Decimal("0.50")


def assess_confidence(
    score: Decimal | float | int,
    ambiguity_flags: list[str] | None = None,
    quality_flags: list[str] | None = None,
    confidence_penalty: Decimal | float | int = Decimal("0.00"),
) -> tuple[Decimal, SignalConfidenceTier, bool, list[str]]:
    """
    Evaluates confidence score and assigns confidence tier and uncertainty status.
    Applies any quality penalty and incorporates quality disclosure flags.
    Returns: (normalized_score, confidence_tier, is_uncertain, uncertainty_reasons)
    """
    raw_score = Decimal(str(score))
    penalty = Decimal(str(confidence_penalty))
    dec_score = max(Decimal("0.00"), min(Decimal("1.00"), raw_score - penalty))
    reasons: list[str] = list(ambiguity_flags or [])

    if quality_flags:
        for qf in quality_flags:
            if qf not in reasons:
                reasons.append(f"Quality notice: {qf}")

    if dec_score >= CONFIDENCE_HIGH_THRESHOLD and not quality_flags:
        tier = SignalConfidenceTier.HIGH
        is_uncertain = False
    elif dec_score >= CONFIDENCE_MEDIUM_THRESHOLD:
        tier = SignalConfidenceTier.MEDIUM
        is_uncertain = False
    else:
        tier = SignalConfidenceTier.LOW
        is_uncertain = True
        if not reasons:
            reasons.append(
                f"Confidence score ({dec_score:.2f}) falls below verification threshold ({CONFIDENCE_MEDIUM_THRESHOLD})"
            )

    return dec_score, tier, is_uncertain, reasons
