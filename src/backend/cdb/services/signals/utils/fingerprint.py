"""
cdb.services.signals.utils.fingerprint

Deterministic evidence fingerprinting for signal deduplication, suppression,
and re-alerting detection.
"""

import hashlib
import json
from typing import Any


def _normalize_dict(d: Any) -> Any:
    """Recursively normalizes dictionary values for canonical JSON serialization."""
    if isinstance(d, dict):
        return {str(k): _normalize_dict(v) for k, v in sorted(d.items())}
    elif isinstance(d, list | tuple | set):
        return [_normalize_dict(x) for x in d]
    elif d is None:
        return None
    return str(d)


def compute_evidence_fingerprint(
    signal_id: str,
    target_id: str | None = None,
    evidence: dict[str, Any] | None = None,
    **kwargs: Any,
) -> str:
    """
    Generates a deterministic SHA-256 fingerprint hash for a detected signal instance's
    core evidence payload.

    Dismissed and resolved signals with the exact same evidence fingerprint will be
    suppressed from re-alerting. When evidence meaningfully changes (e.g. new activity,
    different metric values, new title/event, new date), a distinct fingerprint is generated,
    triggering a valid re-alert.
    """
    evidence = evidence or {}

    canonical: dict[str, Any] = {
        "signal_id": signal_id,
        "target_id": str(target_id) if target_id else "",
        "evidence": _normalize_dict(evidence),
        "extra": _normalize_dict(kwargs),
    }

    serialized = json.dumps(canonical, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
