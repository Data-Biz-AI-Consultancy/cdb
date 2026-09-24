"""
cdb.services.signals.nba.scoring

Next Best Action priority scoring, tier classification (P0-P4), and urgency calculation.
"""

from cdb.schemas.nba import ActionUrgency
from cdb.schemas.signals import DetectedSignalResponse


def calculate_action_priority_score(
    sig: DetectedSignalResponse,
    is_conflict_reconciled: bool = False,
) -> tuple[float, str, str]:
    """
    Computes weighted ranking score (0-100), Priority Tier (P0-P4), and Urgency.
    """
    base_score = float(sig.priority_score) if sig.priority_score is not None else 50.0
    if sig.score is not None and sig.priority_score is None:
        base_score = float(sig.score)

    confidence = float(sig.confidence_score) if sig.confidence_score is not None else 0.8
    confidence_multiplier = 0.7 + (0.3 * min(1.0, max(0.0, confidence)))

    # Urgency boost based on SLA or severity
    urgency_boost = 0.0
    if sig.severity == "critical" or getattr(sig, "is_escalated", False):
        urgency_boost += 15.0
        urgency = ActionUrgency.IMMEDIATE
    elif sig.severity == "high":
        urgency_boost += 8.0
        urgency = ActionUrgency.HIGH
    elif sig.severity == "medium":
        urgency = ActionUrgency.MEDIUM
    else:
        urgency = ActionUrgency.ROUTINE

    # Freshness penalty if evidence is stale or unverified
    freshness_penalty = 0.0
    if getattr(sig, "is_uncertain", False):
        freshness_penalty += 10.0
    if sig.evidence and sig.evidence.evidence_status == "stale":
        freshness_penalty += 8.0

    # Conflict reconciled bonus for holistic strategy
    conflict_boost = 10.0 if is_conflict_reconciled else 0.0

    composite = (
        (base_score * confidence_multiplier) + urgency_boost + conflict_boost - freshness_penalty
    )
    composite = min(100.0, max(0.0, round(composite, 1)))

    # Assign tier
    if composite >= 90.0 or getattr(sig, "is_escalated", False) or sig.severity == "critical":
        tier = "P0"
        urgency = ActionUrgency.IMMEDIATE
    elif composite >= 75.0:
        tier = "P1"
        if urgency == ActionUrgency.ROUTINE:
            urgency = ActionUrgency.HIGH
    elif composite >= 50.0:
        tier = "P2"
    elif composite >= 25.0:
        tier = "P3"
    else:
        tier = "P4"

    return composite, tier, urgency


# Alias for backwards compatibility with tests / internal calls
_calculate_action_priority_score = calculate_action_priority_score
