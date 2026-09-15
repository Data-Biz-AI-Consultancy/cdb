"""
cdb.services.signals.utils

Signal utility modules:
- dates: datetime and timezone normalization (ensure_utc)
- activity: activity parsing and participant extraction (extract_activity_persons)
- account: entity relationship traversal for company attribution (resolve_account_for_signal)
- enrichment: account metadata enrichment and internal employee sanitization
- matching: deduplication query lookup (find_existing_active_signal)
- persistence: signal creation and updates (persist_signal_record)
- linking: participant entity relationship linking (link_signal_persons)
- upsert: master persistence and deduplication coordinator (upsert_detected_signal)
"""

from cdb.services.signals.utils.account import (
    _resolve_account_for_signal,
    resolve_account_for_signal,
)
from cdb.services.signals.utils.activity import extract_activity_persons
from cdb.services.signals.utils.dates import ensure_utc
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
    "ensure_utc",
    "extract_activity_persons",
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
