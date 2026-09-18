"""
cdb.services.signals.classification.prioritization

Prioritization and Business Impact Scoring Engine for Detected Signals.
Ranks detected opportunities and risks using:
1. Account Importance (0-25 pts)
2. Relationship Context (0-25 pts)
3. Urgency & Temporal SLA (0-25 pts)
4. Likely Business Impact (0-25 pts)

Maps composite scores (0-100) to Priority Tiers (P0, P1, P2, P3, P4) and distinguishes
opportunities from risks.
"""

from decimal import Decimal
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from cdb.services.signals.classification.polarity import (
    SignalPolarity,
    resolve_signal_effective_polarity,
)


class SignalPriorityTier(StrEnum):
    P0 = "P0"  # Critical Emergency / Imminent Commercial Cliff (>= 90 or critical override)
    P1 = "P1"  # High Impact (75 - 89)
    P2 = "P2"  # Medium-High Impact (50 - 74)
    P3 = "P3"  # Moderate Impact (25 - 49)
    P4 = "P4"  # Low / Informational (< 25)


class PriorityBreakdown(BaseModel):
    account_importance_score: int = Field(
        ..., ge=0, le=25, description="Account tier, client status, and LTV weighting (0-25)"
    )
    relationship_context_score: int = Field(
        ..., ge=0, le=25, description="Executive seniority and relationship multi-threading (0-25)"
    )
    urgency_score: int = Field(
        ..., ge=0, le=25, description="SLA breach, contract cliff, and time decay (0-25)"
    )
    business_impact_score: int = Field(
        ..., ge=0, le=25, description="Commercial deal value, revenue at risk, or funding (0-25)"
    )
    total_score: int = Field(..., ge=0, le=100, description="Composite priority score (0-100)")
    priority_tier: SignalPriorityTier = Field(..., description="Assigned priority tier P0-P4")
    effective_polarity: str = Field(
        ..., description="Effective commercial classification: opportunity or risk"
    )
    impact_rationale: str = Field(
        ..., description="Transparent explanation of the priority score factors"
    )


def _score_account_importance(
    tier: str | None,
    is_client: bool = False,
    company_segment: str | None = None,
) -> tuple[int, list[str]]:
    """Calculates Account Importance score (0-25 points)."""
    reasons: list[str] = []
    norm_tier = (tier or "").lower().strip().replace("-", "_")
    norm_segment = (company_segment or "").lower().strip()

    if norm_tier in ("strategic", "tier_1", "tier1"):
        score = 25
        reasons.append("Tier 1 Strategic Account (25 pts)")
    elif norm_tier in ("tier_2", "tier2", "expansion"):
        score = 18
        reasons.append("Tier 2 Key Account (18 pts)")
    elif norm_tier in ("tier_3", "tier3"):
        score = 10
        reasons.append("Tier 3 Standard Account (10 pts)")
    elif is_client or "client" in norm_segment:
        score = 15
        reasons.append("Active Client Account (15 pts)")
    elif norm_segment in ("clients_and_prospects", "prospect"):
        score = 8
        reasons.append("Qualified Prospect Account (8 pts)")
    else:
        score = 5
        reasons.append("Standard / Unclassified Account (5 pts)")

    return score, reasons


def _score_relationship_context(
    role: str | None = None,
    connected_persons_count: int = 0,
    is_champion: bool = False,
) -> tuple[int, list[str]]:
    """Calculates Relationship Context score (0-25 points)."""
    reasons: list[str] = []
    norm_role = (role or "").lower().strip()

    # Seniority weighting
    if any(
        kw in norm_role
        for kw in (
            "c-level",
            "ceo",
            "cto",
            "cio",
            "cfo",
            "cpo",
            "coo",
            "founder",
            "partner",
            "vp",
            "vice president",
            "executive",
        )
    ):
        base_score = 22
        reasons.append(f"C-Suite / Executive Stakeholder: {role} (22 pts)")
    elif any(
        kw in norm_role
        for kw in (
            "director",
            "head of",
            "head",
            "principal",
            "managing director",
            "general manager",
        )
    ):
        base_score = 18
        reasons.append(f"Director / Department Head Stakeholder: {role} (18 pts)")
    elif any(kw in norm_role for kw in ("lead", "manager", "senior", "team lead", "staff")):
        base_score = 12
        reasons.append(f"Operational Lead / Manager: {role} (12 pts)")
    elif role:
        base_score = 7
        reasons.append(f"Individual Contributor: {role} (7 pts)")
    else:
        base_score = 5
        reasons.append("General Relationship Context (5 pts)")

    # Champion / Multi-threading bonuses
    bonus = 0
    if is_champion:
        bonus += 3
        reasons.append("Verified Commercial Champion (+3 pts)")
    if connected_persons_count > 1:
        bonus += min(3, connected_persons_count)
        reasons.append(
            f"Multi-Threaded Account ({connected_persons_count} contacts) (+{min(3, connected_persons_count)} pts)"
        )

    score = min(25, base_score + bonus)
    return score, reasons


def _score_urgency(
    severity: str,
    days_elapsed: int | None = None,
    signal_id: str | None = None,
    days_remaining: int | None = None,
) -> tuple[int, list[str]]:
    """Calculates Urgency & SLA score (0-25 points)."""
    reasons: list[str] = []
    norm_sev = (severity or "medium").lower()

    if signal_id == "unanswered_conversation":
        days = days_elapsed if days_elapsed is not None else 3
        if days >= 7:
            score = 25
            reasons.append(f"Critical Inbound SLA Breach ({days}d unanswered) (25 pts)")
        elif days >= 5:
            score = 20
            reasons.append(f"High Inbound Latency ({days}d unanswered) (20 pts)")
        elif days >= 3:
            score = 15
            reasons.append(f"Warning SLA Window ({days}d unanswered) (15 pts)")
        else:
            score = 10
            reasons.append(f"Inbound Latency ({days}d unanswered) (10 pts)")
    elif signal_id == "expiring_contract":
        rem = days_remaining if days_remaining is not None else (30 if norm_sev == "high" else 60)
        if rem <= 14:
            score = 25
            reasons.append(f"Imminent Contract Expiration ({rem}d remaining) (25 pts)")
        elif rem <= 30:
            score = 20
            reasons.append(f"Expiring Contract SLA Window ({rem}d remaining) (20 pts)")
        elif rem <= 60:
            score = 12
            reasons.append(f"Contract Renewal Horizon ({rem}d remaining) (12 pts)")
        else:
            score = 8
            reasons.append(f"Contract Horizon ({rem}d remaining) (8 pts)")
    elif signal_id == "dormant_strategic_account":
        days = days_elapsed if days_elapsed is not None else 60
        if days >= 90:
            score = 22
            reasons.append(f"Critical Account Inactivity ({days}d dormant) (22 pts)")
        else:
            score = 16
            reasons.append(f"Account Inactivity Warning ({days}d dormant) (16 pts)")
    elif signal_id == "competitor_signal":
        score = 22 if norm_sev in ("critical", "high") else 15
        reasons.append(
            "Active Competitor Threat in Pipeline (22 pts)"
            if score == 22
            else "Competitor Mention (15 pts)"
        )
    elif norm_sev == "critical":
        score = 25
        reasons.append("Critical Urgency Severity (25 pts)")
    elif norm_sev == "high":
        score = 18
        reasons.append("High Urgency Severity (18 pts)")
    elif norm_sev == "medium":
        score = 10
        reasons.append("Standard Urgency Cadence (10 pts)")
    else:
        score = 5
        reasons.append("Low Urgency / Informational (5 pts)")

    return min(25, score), reasons


def _score_likely_business_impact(
    polarity: SignalPolarity,
    signal_id: str,
    commercial_value: Decimal | float | int | None = None,
    company_tier: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> tuple[int, list[str]]:
    """Calculates Likely Business Impact score (0-25 points)."""
    reasons: list[str] = []
    metadata = metadata or {}
    val = float(commercial_value) if commercial_value is not None else 0.0

    # Extract additional value hints from metadata if not explicitly provided
    if val == 0.0:
        evidence = metadata.get("evidence") or {}
        comm_ctx = evidence.get("commercial_context") or {}
        if "rate_value" in comm_ctx:
            try:
                val = float(comm_ctx["rate_value"])
            except (ValueError, TypeError):
                pass
        elif "funding_amount" in metadata:
            try:
                val = float(metadata["funding_amount"])
            except (ValueError, TypeError):
                pass

    if polarity == SignalPolarity.OPPORTUNITY:
        # Opportunity Upside Evaluation
        if val >= 100_000:
            score = 25
            reasons.append(f"Major Commercial Upside (Deal/Funding: ${val:,.0f}) (25 pts)")
        elif val >= 30_000:
            score = 20
            reasons.append(f"Significant Commercial Opportunity (${val:,.0f}) (20 pts)")
        elif val > 0:
            score = 15
            reasons.append(f"Active Opportunity Value (${val:,.0f}) (15 pts)")
        elif signal_id == "hiring_funding_event":
            score = 18
            reasons.append("Capital Expansion / Team Acceleration Opportunity (18 pts)")
        elif signal_id == "leadership_change":
            score = 18
            reasons.append("New Executive Mandate & Budget Window (18 pts)")
        elif signal_id == "expiring_contract":
            score = 16
            reasons.append("Contract Renewal & Scope Expansion Window (16 pts)")
        else:
            score = 10
            reasons.append("Standard Opportunity Upside (10 pts)")
    else:
        # Risk Downside Exposure Evaluation
        norm_tier = (company_tier or "").lower()
        if val >= 100_000:
            score = 25
            reasons.append(f"Critical Revenue at Risk (${val:,.0f} Contract/Deal) (25 pts)")
        elif val >= 30_000:
            score = 20
            reasons.append(f"Substantial Revenue Exposure (${val:,.0f}) (20 pts)")
        elif signal_id == "competitor_signal":
            score = 22
            reasons.append("Direct Competitor Displacement Threat (22 pts)")
        elif signal_id == "leadership_change":
            score = 20 if norm_tier in ("strategic", "tier_1") else 15
            reasons.append(
                "Lost Executive Champion at Client Account (20 pts)"
                if score == 20
                else "Champion Departure Risk (15 pts)"
            )
        elif signal_id == "dormant_strategic_account":
            score = 20 if norm_tier in ("strategic", "tier_1") else 14
            reasons.append(
                "High Churn Exposure on Strategic Account (20 pts)"
                if score == 20
                else "Account Inactivity Risk (14 pts)"
            )
        elif signal_id == "unanswered_conversation":
            score = 18 if norm_tier in ("strategic", "tier_1") else 12
            reasons.append(
                "Client Relationship Friction & Deal Stalling (18 pts)"
                if score == 18
                else "Unanswered Thread Friction (12 pts)"
            )
        else:
            score = 10
            reasons.append("Standard Operational Risk Exposure (10 pts)")

    return min(25, score), reasons


def calculate_signal_priority(
    signal_id: str,
    severity: str = "medium",
    company_tier: str | None = None,
    is_client: bool = False,
    company_segment: str | None = None,
    role: str | None = None,
    connected_persons_count: int = 0,
    is_champion: bool = False,
    days_elapsed: int | None = None,
    days_remaining: int | None = None,
    commercial_value: Decimal | float | int | None = None,
    metadata_payload: dict[str, Any] | None = None,
) -> PriorityBreakdown:
    """
    Computes a deterministic, transparent composite priority score (0-100)
    across the four core business impact dimensions:
    - Account Importance (0-25)
    - Relationship Context (0-25)
    - Urgency & SLA (0-25)
    - Likely Business Impact (0-25)

    Assigns Priority Tier (P0, P1, P2, P3, P4) and distinguishes Opportunities from Risks.
    """
    metadata_payload = metadata_payload or {}

    # 1. Resolve Effective Polarity
    meta_for_polarity = dict(metadata_payload)
    if days_remaining is not None:
        meta_for_polarity.setdefault("days_left", days_remaining)
    polarity = resolve_signal_effective_polarity(
        signal_id=signal_id,
        metadata=meta_for_polarity,
    )
    effective_polarity_str = polarity.value

    # 2. Compute the 4 Dimension Scores
    account_score, acct_reasons = _score_account_importance(
        tier=company_tier,
        is_client=is_client,
        company_segment=company_segment,
    )

    relationship_score, rel_reasons = _score_relationship_context(
        role=role,
        connected_persons_count=connected_persons_count,
        is_champion=is_champion,
    )

    urgency_score, urg_reasons = _score_urgency(
        severity=severity,
        days_elapsed=days_elapsed,
        signal_id=signal_id,
        days_remaining=days_remaining,
    )

    impact_score, imp_reasons = _score_likely_business_impact(
        polarity=polarity,
        signal_id=signal_id,
        commercial_value=commercial_value,
        company_tier=company_tier,
        metadata=metadata_payload,
    )

    total_score = account_score + relationship_score + urgency_score + impact_score

    # 3. Check for Special P0 Override Cases
    # P0 Trigger conditions:
    # - Critical SLA breach (>7d unanswered) on Strategic / Tier 1 Account
    # - Imminent contract expiration (<=14d) with substantial value or Tier 1 account
    # - Direct competitor displacement in late-stage high-value opportunity
    is_p0_override = False
    norm_tier = (company_tier or "").lower().strip()
    is_strategic = norm_tier in ("strategic", "tier_1", "tier1")

    if is_strategic and severity.lower() == "critical":
        is_p0_override = True
    elif signal_id == "unanswered_conversation" and is_strategic and (days_elapsed or 0) >= 7:
        is_p0_override = True
    elif (
        signal_id == "expiring_contract"
        and (days_remaining is not None and days_remaining <= 14)
        and (is_strategic or float(commercial_value or 0) >= 50_000)
    ):
        is_p0_override = True

    if is_p0_override:
        total_score = max(total_score, 92)

    # 4. Map Total Score to Priority Tier
    if total_score >= 90:
        priority_tier = SignalPriorityTier.P0
    elif total_score >= 75:
        priority_tier = SignalPriorityTier.P1
    elif total_score >= 50:
        priority_tier = SignalPriorityTier.P2
    elif total_score >= 25:
        priority_tier = SignalPriorityTier.P3
    else:
        priority_tier = SignalPriorityTier.P4

    # 5. Build Impact Rationale Explanation
    all_reasons = acct_reasons + rel_reasons + urg_reasons + imp_reasons
    rationale_header = f"[{priority_tier.value} {effective_polarity_str.upper()}] Business Impact Score: {total_score}/100"
    rationale_body = " • ".join(all_reasons)
    full_rationale = f"{rationale_header} — {rationale_body}"

    return PriorityBreakdown(
        account_importance_score=account_score,
        relationship_context_score=relationship_score,
        urgency_score=urgency_score,
        business_impact_score=impact_score,
        total_score=total_score,
        priority_tier=priority_tier,
        effective_polarity=effective_polarity_str,
        impact_rationale=full_rationale,
    )


__all__ = [
    "SignalPriorityTier",
    "PriorityBreakdown",
    "calculate_signal_priority",
]
