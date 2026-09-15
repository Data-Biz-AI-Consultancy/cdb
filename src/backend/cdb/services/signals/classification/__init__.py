"""
cdb.services.signals.classification

Defines consistent classification rules for opportunity and risk signals:
- Qualification criteria distinguishing opportunity, risk, and hybrid signals
- Severity levels, confidence thresholds (High, Medium, Low), and scoring heuristics
- Standardized supporting evidence contract and schema
- Cross-signal conflict detection across Company, Opportunity, and Person scopes
- Uncertainty identification for low-confidence or ambiguous signals
"""

from cdb.services.signals.classification.confidence import (
    CONFIDENCE_HIGH_THRESHOLD,
    CONFIDENCE_MEDIUM_THRESHOLD,
    SignalConfidenceTier,
    assess_confidence,
)
from cdb.services.signals.classification.conflicts import (
    ConflictScope,
    detect_signal_conflicts,
)
from cdb.services.signals.classification.evidence import (
    build_evidence_payload,
    build_signal_meta,
)
from cdb.services.signals.classification.polarity import (
    SignalPolarity,
    resolve_signal_effective_polarity,
)
from cdb.services.signals.classification.rules import (
    SIGNAL_CLASSIFICATION_RULES,
    ClassificationRule,
)

__all__ = [
    "SignalPolarity",
    "SignalConfidenceTier",
    "ConflictScope",
    "CONFIDENCE_HIGH_THRESHOLD",
    "CONFIDENCE_MEDIUM_THRESHOLD",
    "ClassificationRule",
    "SIGNAL_CLASSIFICATION_RULES",
    "build_evidence_payload",
    "build_signal_meta",
    "assess_confidence",
    "resolve_signal_effective_polarity",
    "detect_signal_conflicts",
]
