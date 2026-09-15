"""
cdb.services.signals.classification.conflicts

Multi-entity polarity conflict detection across Company, Opportunity, and Person scopes.
"""

from enum import StrEnum
from typing import Any

from cdb.services.signals.classification.polarity import (
    SignalPolarity,
    resolve_signal_effective_polarity,
)


class ConflictScope(StrEnum):
    COMPANY = "company"
    OPPORTUNITY = "opportunity"
    PERSON = "person"


def detect_signal_conflicts(
    detected_signals: list[Any],
) -> dict[str, dict[str, Any]]:
    """
    Scans a list of active detected signals across Company, Opportunity, and Person scopes
    to identify polarity collisions (e.g. active Risk co-existing with active Opportunity).

    Returns a dict mapping signal instance ID (str) -> conflict metadata payload:
    {
        "has_conflict": bool,
        "conflicting_signal_ids": list[str],
        "conflict_summary": str | None,
        "conflict_scope": str | None
    }
    """
    results: dict[str, dict[str, Any]] = {}

    # Initialize all signals with no conflict
    for sig in detected_signals:
        sig_id_str = str(getattr(sig, "id", None) or id(sig))
        results[sig_id_str] = {
            "has_conflict": False,
            "conflicting_signal_ids": [],
            "conflict_summary": None,
            "conflict_scope": None,
        }

    # Group signals by Company, Opportunity, and Person
    by_company: dict[str, list[Any]] = {}
    by_opportunity: dict[str, list[Any]] = {}
    by_person: dict[str, list[Any]] = {}

    for sig in detected_signals:
        status = getattr(sig, "status", "active")
        if status not in ("active", "acknowledged"):
            continue

        cid = getattr(sig, "company_id", None)
        if cid:
            by_company.setdefault(str(cid), []).append(sig)

        oid = getattr(sig, "opportunity_id", None)
        if oid:
            by_opportunity.setdefault(str(oid), []).append(sig)

        pid = getattr(sig, "person_id", None)
        if pid:
            by_person.setdefault(str(pid), []).append(sig)

    def check_group_conflicts(
        group: dict[str, list[Any]],
        scope: ConflictScope,
    ) -> None:
        for _entity_id, sigs in group.items():
            if len(sigs) < 2:
                continue

            opps: list[Any] = []
            risks: list[Any] = []

            for s in sigs:
                meta = getattr(s, "metadata_payload", None) or getattr(s, "metadata", {}) or {}
                sig_type = getattr(s, "signal_id", "")
                polarity = resolve_signal_effective_polarity(sig_type, meta)

                if polarity == SignalPolarity.OPPORTUNITY:
                    opps.append(s)
                elif polarity == SignalPolarity.RISK:
                    risks.append(s)

            # Polarity collision detected!
            if opps and risks:
                opp_titles = [getattr(s, "title", "Opportunity") for s in opps]
                risk_titles = [getattr(s, "title", "Risk") for s in risks]

                # Compose explanation based on scope
                if scope == ConflictScope.COMPANY:
                    summary = (
                        f"Company-level conflict: Account exhibits both Opportunity momentum "
                        f"({', '.join(opp_titles[:2])}) and Risk indicators ({', '.join(risk_titles[:2])}). "
                        "Review account context before proceeding."
                    )
                elif scope == ConflictScope.OPPORTUNITY:
                    summary = (
                        f"Opportunity-level conflict: Deal has active expansion signals "
                        f"({', '.join(opp_titles[:2])}) but also competitor/churn risks ({', '.join(risk_titles[:2])}). "
                        "Validate deal positioning."
                    )
                else:  # PERSON
                    summary = (
                        f"Person-level conflict: Contact has unanswered communication risk "
                        f"while undergoing role/stakeholder transition ({', '.join(opp_titles + risk_titles)}). "
                        "Verify current affiliation and recipient destination."
                    )

                all_involved = opps + risks
                all_involved_ids = [str(getattr(s, "id", None) or id(s)) for s in all_involved]

                for s in all_involved:
                    s_id = str(getattr(s, "id", None) or id(s))
                    other_ids = [oid for oid in all_involved_ids if oid != s_id]
                    results[s_id] = {
                        "has_conflict": True,
                        "conflicting_signal_ids": other_ids,
                        "conflict_summary": summary,
                        "conflict_scope": scope.value,
                    }

    # Execute conflict checks across all 3 scopes
    check_group_conflicts(by_company, ConflictScope.COMPANY)
    check_group_conflicts(by_opportunity, ConflictScope.OPPORTUNITY)
    check_group_conflicts(by_person, ConflictScope.PERSON)

    return results
