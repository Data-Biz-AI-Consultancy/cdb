"""
cdb.services.signals.detector

Compatibility shim — all logic has been refactored into focused sub-modules:

  patterns.py       — compiled regex constants
  utils/            — shared DB helpers (account resolution, signal upsert)
  detectors/        — one file per signal type (dormant, unanswered, contracts,
                       leadership, growth, competitors)
  orchestrator.py   — evaluate_all_signals master runner

This file re-exports everything so that all existing imports such as:

    from cdb.services.signals.detector import evaluate_all_signals
    from cdb.services.signals.detector import detect_competitor_signals
    from cdb.services.signals.detector import _resolve_account_for_signal

…continue to work without any modification.
"""

from cdb.services.signals.detectors import (  # noqa: F401
    detect_competitor_signals,
    detect_dormant_strategic_accounts,
    detect_expiring_contracts,
    detect_hiring_funding_events,
    detect_leadership_changes,
    detect_unanswered_conversations,
)
from cdb.services.signals.orchestrator import evaluate_all_signals  # noqa: F401
from cdb.services.signals.utils import (  # noqa: F401
    _resolve_account_for_signal,
    _upsert_detected_signal,
    resolve_account_for_signal,
    upsert_detected_signal,
)

__all__ = [
    "resolve_account_for_signal",
    "_resolve_account_for_signal",
    "upsert_detected_signal",
    "_upsert_detected_signal",
    "detect_dormant_strategic_accounts",
    "detect_expiring_contracts",
    "detect_unanswered_conversations",
    "detect_leadership_changes",
    "detect_hiring_funding_events",
    "detect_competitor_signals",
    "evaluate_all_signals",
]
