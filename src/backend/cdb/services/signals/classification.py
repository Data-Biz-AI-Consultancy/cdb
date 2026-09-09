"""
cdb.services.signals.classification

Defines consistent classification rules for opportunity and risk signals:
- Qualification criteria distinguishing opportunity, risk, and hybrid signals
- Severity levels, confidence thresholds (High, Medium, Low), and scoring heuristics
- Standardized supporting evidence contract and schema
- Cross-signal conflict detection across Company, Opportunity, and Person scopes
- Uncertainty identification for low-confidence or ambiguous signals
"""

from dataclasses import dataclass
from decimal import Decimal
from enum import StrEnum
from typing import Any


class SignalPolarity(StrEnum):
    OPPORTUNITY = "opportunity"
    RISK = "risk"
    HYBRID = "hybrid"


class SignalConfidenceTier(StrEnum):
    HIGH = "high"  # >= 0.80: Verified structured data
    MEDIUM = "medium"  # 0.50 - 0.79: Probable text/role match
    LOW = "low"  # < 0.50: Ambiguous or stale, flagged as uncertain


class ConflictScope(StrEnum):
    COMPANY = "company"
    OPPORTUNITY = "opportunity"
    PERSON = "person"


# Threshold constants
CONFIDENCE_HIGH_THRESHOLD = Decimal("0.80")
CONFIDENCE_MEDIUM_THRESHOLD = Decimal("0.50")


@dataclass(frozen=True)
class ClassificationRule:
    signal_id: str
    name: str
    base_category: SignalPolarity
    target_entity: str
    qualification_criteria: str
    required_evidence_type: str
    default_severity: str
    severity_conditions: dict[str, str]
    confidence_rationale: str


# ─────────────────────────────────────────────────────────────────────────────
# Canonical Classification Rules for the 6 Initial Catalog Signals
# ─────────────────────────────────────────────────────────────────────────────

SIGNAL_CLASSIFICATION_RULES: dict[str, ClassificationRule] = {
    "dormant_strategic_account": ClassificationRule(
        signal_id="dormant_strategic_account",
        name="Dormant Strategic Account",
        base_category=SignalPolarity.RISK,
        target_entity="company",
        qualification_criteria=(
            "Company qualifies as strategic (signed engagement, closed-won deal, "
            "or strategic segment tag) and has no recorded touchpoints in > 60 days."
        ),
        required_evidence_type="temporal_inactivity",
        default_severity="high",
        severity_conditions={
            "critical": "Inactivity exceeds 90 days with past signed engagements",
            "high": "Inactivity between 60 and 89 days",
        },
        confidence_rationale=(
            "Calculated from verifiable activity logs. 0.90 if activity history exists; "
            "0.70 if account has no history at all."
        ),
    ),
    "unanswered_conversation": ClassificationRule(
        signal_id="unanswered_conversation",
        name="Unanswered Conversation",
        base_category=SignalPolarity.RISK,
        target_entity="person",
        qualification_criteria=(
            "Inbound client or prospect communication received where the external contact "
            "was the last sender and no outbound response has been logged for > 3 days."
        ),
        required_evidence_type="message_sla",
        default_severity="high",
        severity_conditions={
            "critical": "Unanswered duration exceeds 7 days (critical SLA breach)",
            "high": "Unanswered duration between 3 and 7 days",
        },
        confidence_rationale=(
            "High confidence (0.95) derived directly from timestamped interaction logs."
        ),
    ),
    "expiring_contract": ClassificationRule(
        signal_id="expiring_contract",
        name="Expiring Contract",
        base_category=SignalPolarity.HYBRID,
        target_entity="engagement",
        qualification_criteria=(
            "Active consulting engagement with signed contract status approaching "
            "its expected end date within 60 days."
        ),
        required_evidence_type="contract_milestone",
        default_severity="high",
        severity_conditions={
            "critical": "Expected end date is within 14 days or overdue without renewal",
            "high": "Expected end date is within 15 to 30 days",
            "medium": "Expected end date is within 31 to 60 days",
        },
        confidence_rationale=(
            "Deterministic confidence (0.95) based on contractual expected_end_date."
        ),
    ),
    "leadership_change": ClassificationRule(
        signal_id="leadership_change",
        name="Leadership Change",
        base_category=SignalPolarity.HYBRID,
        target_entity="person",
        qualification_criteria=(
            "Key decision maker or executive sponsor departures (Risk of lost champion) "
            "or new executive role appointments (Opportunity for new budget/mandate) in past 60 days."
        ),
        required_evidence_type="relationship_transition",
        default_severity="high",
        severity_conditions={
            "high": "Executive title (CTO, CIO, VP, Head of, Director) transition in last 60 days",
            "medium": "Non-executive or advisory role transition",
        },
        confidence_rationale=(
            "0.85 for verified role updates with exact start/end dates; 0.65 for unverified roles."
        ),
    ),
    "hiring_funding_event": ClassificationRule(
        signal_id="hiring_funding_event",
        name="Hiring or Funding Event",
        base_category=SignalPolarity.OPPORTUNITY,
        target_entity="company",
        qualification_criteria=(
            "Recent activity content or company update confirms fresh capital injection (Seed, "
            "Series A/B, PE) or technical hiring acceleration in data, AI, or engineering."
        ),
        required_evidence_type="text_pattern",
        default_severity="medium",
        severity_conditions={
            "high": "Direct multi-round funding announcement with exact capital amount",
            "medium": "Hiring expansion or single round keyword match in last 90 days",
        },
        confidence_rationale=(
            "Text pattern match: 0.75 for clear funding/hiring phrases; "
            "reduced to 0.45 (uncertain) if phrase is ambiguous or context is unverified."
        ),
    ),
    "competitor_signal": ClassificationRule(
        signal_id="competitor_signal",
        name="Competitor Signal",
        base_category=SignalPolarity.RISK,
        target_entity="opportunity",
        qualification_criteria=(
            "Activity notes, transcripts, or opportunity logs indicate client is actively evaluating, "
            "pricing, or running a bake-off with competing consultancies or alternative tech stacks."
        ),
        required_evidence_type="text_pattern",
        default_severity="high",
        severity_conditions={
            "critical": "Explicit mention of competing proposal or RFP bake-off in late deal stages",
            "high": "Named competitor evaluation in deal interactions within 90 days",
        },
        confidence_rationale=(
            "Text pattern match: 0.85 for named competitor consultancies; "
            "0.55 for generic phrases like 'cheaper alternative'."
        ),
    ),
}


# ─────────────────────────────────────────────────────────────────────────────
# Evidence Contract & Confidence Assessment Helpers
# ─────────────────────────────────────────────────────────────────────────────


def build_evidence_payload(
    evidence_type: str,
    source_entity_type: str,
    source_entity_id: str | None,
    occurred_at: str | None,
    days_elapsed: int | None = None,
    excerpt: str | None = None,
    key_metrics: dict[str, Any] | None = None,
    verification_status: str = "verified",
) -> dict[str, Any]:
    """
    Standardized contract for supporting evidence attached to a detected signal.
    """
    return {
        "evidence_type": evidence_type,
        "source_entity_type": source_entity_type,
        "source_entity_id": str(source_entity_id) if source_entity_id else None,
        "occurred_at": occurred_at,
        "days_elapsed": days_elapsed,
        "excerpt": excerpt,
        "key_metrics": key_metrics or {},
        "verification_status": verification_status,
    }


def assess_confidence(
    score: Decimal | float | int,
    ambiguity_flags: list[str] | None = None,
) -> tuple[Decimal, SignalConfidenceTier, bool, list[str]]:
    """
    Evaluates confidence score and assigns confidence tier and uncertainty status.
    Returns: (normalized_score, confidence_tier, is_uncertain, uncertainty_reasons)
    """
    dec_score = Decimal(str(score))
    reasons: list[str] = list(ambiguity_flags or [])

    if dec_score >= CONFIDENCE_HIGH_THRESHOLD:
        tier = SignalConfidenceTier.HIGH
        is_uncertain = False
    elif dec_score >= CONFIDENCE_MEDIUM_THRESHOLD:
        tier = SignalConfidenceTier.MEDIUM
        is_uncertain = False
    else:
        tier = SignalConfidenceTier.LOW
        is_uncertain = True
        if not reasons:
            reasons.append(
                f"Confidence score ({dec_score:.2f}) falls below verification threshold ({CONFIDENCE_MEDIUM_THRESHOLD})"
            )

    return dec_score, tier, is_uncertain, reasons


def resolve_signal_effective_polarity(
    signal_id: str,
    metadata: dict[str, Any] | None = None,
) -> SignalPolarity:
    """
    Resolves the effective polarity (Opportunity vs. Risk) of a signal.
    For hybrid signals like leadership_change or expiring_contract,
    evaluates sub-type parameters.
    """
    meta = metadata or {}
    rule = SIGNAL_CLASSIFICATION_RULES.get(signal_id)
    if not rule:
        return SignalPolarity.RISK

    if rule.base_category != SignalPolarity.HYBRID:
        return rule.base_category

    # Hybrid Resolution
    if signal_id == "leadership_change":
        event_type = str(meta.get("event_type", "")).lower()
        if "departure" in event_type or "left" in event_type:
            return SignalPolarity.RISK
        if "arrival" in event_type or "new_hire" in event_type:
            return SignalPolarity.OPPORTUNITY
        return SignalPolarity.HYBRID

    if signal_id == "expiring_contract":
        days_left = meta.get("days_left")
        if days_left is not None and days_left <= 14:
            # Urgent churn/interruption cliff
            return SignalPolarity.RISK
        # Ample runway for scope renewal / upsell motion
        return SignalPolarity.OPPORTUNITY

    return SignalPolarity.HYBRID


# ─────────────────────────────────────────────────────────────────────────────
# Multi-Entity Conflict Detection (Company, Opportunity, Person)
# ─────────────────────────────────────────────────────────────────────────────


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
