"""
cdb.services.signals.classification.polarity

Defines signal polarity enums and dynamic polarity resolution logic.
"""

from enum import StrEnum
from typing import Any


class SignalPolarity(StrEnum):
    OPPORTUNITY = "opportunity"
    RISK = "risk"
    HYBRID = "hybrid"


def resolve_signal_effective_polarity(
    signal_id: str,
    metadata: dict[str, Any] | None = None,
) -> SignalPolarity:
    """
    Resolves the effective polarity (Opportunity vs. Risk) of a signal.
    For hybrid signals like leadership_change or expiring_contract,
    evaluates sub-type parameters.
    """
    from cdb.services.signals.classification.rules import SIGNAL_CLASSIFICATION_RULES

    meta = metadata or {}
    rule = SIGNAL_CLASSIFICATION_RULES.get(signal_id)
    if not rule:
        return SignalPolarity.RISK

    if rule.base_category != SignalPolarity.HYBRID:
        return rule.base_category

    # Hybrid Resolution
    if signal_id == "leadership_change":
        event_type = str(meta.get("event_type", "")).lower()
        if "departure" in event_type or "left" in event_type:
            return SignalPolarity.RISK
        if "arrival" in event_type or "new_hire" in event_type:
            return SignalPolarity.OPPORTUNITY
        return SignalPolarity.HYBRID

    if signal_id == "expiring_contract":
        days_left = meta.get("days_left")
        if days_left is not None and days_left <= 14:
            # Urgent churn/interruption cliff
            return SignalPolarity.RISK
        # Ample runway for scope renewal / upsell motion
        return SignalPolarity.OPPORTUNITY

    return SignalPolarity.HYBRID
