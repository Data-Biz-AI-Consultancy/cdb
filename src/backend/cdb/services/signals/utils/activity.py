"""
cdb.services.signals.utils.activity

Activity parsing and participant extraction utilities for signal detectors.
"""

import uuid
from typing import Any


def extract_activity_persons(
    act: Any,
) -> tuple[list[Any], dict[str, str], list[Any]]:
    """
    Extracts connected person IDs, role mappings, and suggested persons from an
    Activity's attributes dict.

    Sources examined:
    - ``participant_person_ids``: flat list of person UUIDs
    - ``entities``: list of entity dicts with ``person_id``, ``role``, ``is_internal``
    - ``suggested_persons``: unresolved name hints returned by enrichment pipelines

    Returns:
        connected_pids    — deduplicated list of external person UUIDs
        person_roles      — {str(uuid): role} mapping for each connected person
        suggested_persons — raw suggested-person list (caller may store in meta)

    Note: Does NOT include ``act.person_id`` — the caller should prepend it as the
    primary person when appropriate.
    """
    connected_pids: list[Any] = []
    person_roles: dict[str, str] = {}
    suggested_persons: list[Any] = []

    attrs = act.attributes
    if not attrs or not isinstance(attrs, dict):
        return connected_pids, person_roles, suggested_persons

    for extra_pid in attrs.get("participant_person_ids", []):
        if extra_pid and extra_pid not in connected_pids:
            connected_pids.append(extra_pid)

    for e in attrs.get("entities", []):
        epid = e.get("person_id")
        erole = e.get("role") or "counterparty"
        if epid and not e.get("is_internal"):
            try:
                uuid_val = uuid.UUID(epid) if isinstance(epid, str) else epid
                if uuid_val not in connected_pids:
                    connected_pids.append(uuid_val)
                person_roles[str(uuid_val)] = erole
            except Exception:
                pass

    suggested_persons = attrs.get("suggested_persons") or []
    return connected_pids, person_roles, suggested_persons
