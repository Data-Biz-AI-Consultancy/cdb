"""
cdb.services.signals.utils.dates

Date and timestamp normalization utilities for signal detectors.
"""

import datetime


def ensure_utc(dt: datetime.datetime) -> datetime.datetime:
    """Returns dt as a UTC-aware datetime, converting naive instances if needed."""
    return dt if dt.tzinfo else dt.replace(tzinfo=datetime.UTC)


def days_between(
    dt: datetime.datetime | None,
    now: datetime.datetime,
    default: int = 999,
) -> int:
    """Calculates the number of full days elapsed between dt and now (UTC-normalized)."""
    if dt is None:
        return default
    utc_dt = ensure_utc(dt)
    return (now - utc_dt).days


def format_days_remaining_label(days: int) -> str:
    """Formats a remaining day count into a readable label (e.g., '14d remaining' or '3d overdue')."""
    return f"{days}d remaining" if days >= 0 else f"{-days}d overdue"
