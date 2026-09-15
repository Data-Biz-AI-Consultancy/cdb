"""
cdb.services.signals.detectors

Re-exports all individual detect_* functions so callers can import from
this package or from the specific sub-module — whichever they prefer.
"""

from cdb.services.signals.detectors.competitors import detect_competitor_signals
from cdb.services.signals.detectors.contracts import detect_expiring_contracts
from cdb.services.signals.detectors.dormant import detect_dormant_strategic_accounts
from cdb.services.signals.detectors.growth import detect_hiring_funding_events
from cdb.services.signals.detectors.leadership import detect_leadership_changes
from cdb.services.signals.detectors.unanswered import detect_unanswered_conversations

__all__ = [
    "detect_dormant_strategic_accounts",
    "detect_expiring_contracts",
    "detect_unanswered_conversations",
    "detect_leadership_changes",
    "detect_hiring_funding_events",
    "detect_competitor_signals",
]
