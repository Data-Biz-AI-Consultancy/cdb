"""
cdb.services.signals.classification.rules

Classification rules and catalog definitions for signal qualification.
"""

from dataclasses import dataclass

from cdb.services.signals.classification.polarity import SignalPolarity


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
