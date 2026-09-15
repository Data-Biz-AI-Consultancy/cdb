"""
cdb.services.signals.utils

Shared utility functions for signal evaluation and persistence:
- resolve_account_for_signal: entity relationship traversal for company attribution
- enrich_company_context: account metadata enrichment
- sanitize_target_persons: internal employee filtering
- find_existing_active_signal: deduplication query lookup
- persist_signal_record: signal creation and updates
- link_signal_persons: participant entity relationship linking
- upsert_detected_signal: master persistence and deduplication coordinator
"""

from cdb.services.signals.utils.account import (
    _resolve_account_for_signal,
    resolve_account_for_signal,
)
from cdb.services.signals.utils.enrichment import (
    enrich_company_context,
    sanitize_target_persons,
)
from cdb.services.signals.utils.linking import link_signal_persons
from cdb.services.signals.utils.matching import find_existing_active_signal
from cdb.services.signals.utils.persistence import persist_signal_record
from cdb.services.signals.utils.upsert import (
    _upsert_detected_signal,
    upsert_detected_signal,
)

__all__ = [
    "resolve_account_for_signal",
    "_resolve_account_for_signal",
    "enrich_company_context",
    "sanitize_target_persons",
    "find_existing_active_signal",
    "persist_signal_record",
    "link_signal_persons",
    "upsert_detected_signal",
    "_upsert_detected_signal",
]
