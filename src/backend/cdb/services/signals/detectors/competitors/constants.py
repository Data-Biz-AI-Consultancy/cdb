"""
cdb.services.signals.detectors.competitors.constants

Known competitor consultancies and high-intent bake-off indicators.
"""

NAMED_CONSULTANCIES: frozenset[str] = frozenset(
    {"slalom", "thoughtworks", "accenture", "deloitte", "competing proposal", "bake-off", "rfp"}
)

_NAMED_CONSULTANCIES: frozenset[str] = NAMED_CONSULTANCIES

__all__ = ["NAMED_CONSULTANCIES", "_NAMED_CONSULTANCIES"]
