"""
cdb.services.signals.nba

Next Best Action (NBA) Ranking, Action Deduplication, and Conflict Reconciliation Engine.
"""

from cdb.services.signals.nba.playbooks import DEFAULT_PLAYBOOKS
from cdb.services.signals.nba.reconciliation import (
    build_consolidated_person_action,
    build_reconciled_company_action,
    build_standalone_signal_action,
)
from cdb.services.signals.nba.scoring import (
    _calculate_action_priority_score,
    calculate_action_priority_score,
)
from cdb.services.signals.nba.service import (
    generate_next_best_actions,
    get_company_next_best_actions,
    get_global_next_best_actions,
)

__all__ = [
    "DEFAULT_PLAYBOOKS",
    "calculate_action_priority_score",
    "_calculate_action_priority_score",
    "build_reconciled_company_action",
    "build_consolidated_person_action",
    "build_standalone_signal_action",
    "generate_next_best_actions",
    "get_company_next_best_actions",
    "get_global_next_best_actions",
]
