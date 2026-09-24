"""
cdb.services.signals.routing

Facade package for signal ownership resolution, manual assignment,
escalation triggers, and follow-up CRM workflow routing.
"""

from cdb.services.signals.routing.service import (
    assign_signal_owner,
    deescalate_signal,
    escalate_signal,
    evaluate_signal_escalation,
    resolve_signal_owner,
)
from cdb.services.signals.routing.workflows import (
    route_signal_to_opportunity,
    route_signal_to_workflow,
)

__all__ = [
    "resolve_signal_owner",
    "evaluate_signal_escalation",
    "assign_signal_owner",
    "escalate_signal",
    "deescalate_signal",
    "route_signal_to_opportunity",
    "route_signal_to_workflow",
]
