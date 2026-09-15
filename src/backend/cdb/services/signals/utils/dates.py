"""
cdb.services.signals.utils.dates

Date and timestamp normalization utilities for signal detectors.
"""

import datetime


def ensure_utc(dt: datetime.datetime) -> datetime.datetime:
    """Returns dt as a UTC-aware datetime, converting naive instances if needed."""
    return dt if dt.tzinfo else dt.replace(tzinfo=datetime.UTC)
