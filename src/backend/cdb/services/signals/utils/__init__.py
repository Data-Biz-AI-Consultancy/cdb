"""
cdb.services.signals.utils

Signal utility modules:
- dates: datetime and timezone normalization (ensure_utc, days_between)
- activity: activity parsing and participant extraction (extract_activity_persons, get_activity_searchable_text, is_last_speaker_host, has_newer_outbound_activity)
- account: entity relationship traversal and display names (resolve_account_for_signal, get_strategic_companies, get_person_display_name, get_company_display_name)
- enrichment: account metadata enrichment, attribute parsing, and internal employee sanitization
- matching: deduplication query lookup (find_existing_active_signal)
- persistence: signal creation and updates (persist_signal_record)
- linking: participant entity relationship linking (link_signal_persons)
- upsert: master persistence and deduplication coordinator (upsert_detected_signal)
"""

from cdb.services.signals.utils.account import (
    _resolve_account_for_signal,
    get_company_display_name,
    get_person_display_name,
    get_strategic_companies,
    resolve_account_for_signal,
)
from cdb.services.signals.utils.activity import (
    extract_activity_persons,
    get_activity_searchable_text,
    has_newer_outbound_activity,
    is_last_speaker_host,
)
from cdb.services.signals.utils.dates import (
    days_between,
    ensure_utc,
)
from cdb.services.signals.utils.enrichment import (
    enrich_company_context,
    extract_funding_enrichment,
    extract_headcount_enrichment,
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
    "days_between",
    "ensure_utc",
    "extract_activity_persons",
    "get_activity_searchable_text",
    "is_last_speaker_host",
    "has_newer_outbound_activity",
    "extract_funding_enrichment",
    "extract_headcount_enrichment",
    "resolve_account_for_signal",
    "_resolve_account_for_signal",
    "get_strategic_companies",
    "get_person_display_name",
    "get_company_display_name",
    "enrich_company_context",
    "sanitize_target_persons",
    "find_existing_active_signal",
    "persist_signal_record",
    "link_signal_persons",
    "upsert_detected_signal",
    "_upsert_detected_signal",
]
