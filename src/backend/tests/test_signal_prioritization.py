"""
Tests for Signal Prioritization Engine and Business Impact Ranking.
"""

from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.company import Company
from cdb.models.person import Person
from cdb.services.signals.classification.prioritization import (
    SignalPriorityTier,
    calculate_signal_priority,
)
from cdb.services.signals.detected.query import list_detected_signals
from cdb.services.signals.utils.upsert import upsert_detected_signal


def test_prioritization_dimensions_and_breakdown():
    """Verify that all four dimensions score correctly and sum into composite total."""
    result = calculate_signal_priority(
        signal_id="dormant_strategic_account",
        severity="high",
        company_tier="strategic",
        is_client=True,
        role="VP Engineering",
        connected_persons_count=3,
        is_champion=True,
        days_elapsed=65,
        commercial_value=50_000,
    )

    assert result.total_score >= 75
    assert result.priority_tier in (SignalPriorityTier.P0, SignalPriorityTier.P1)
    assert result.account_importance_score == 25  # Strategic Tier 1
    assert (
        result.relationship_context_score == 25
    )  # VP (22) + Champion (+3) + Multi-thread capped at 25
    assert result.urgency_score >= 16  # Dormant 65d
    assert result.business_impact_score >= 20  # Value 50k risk
    assert result.effective_polarity == "risk"
    assert "Business Impact Score" in result.impact_rationale


def test_prioritization_opportunity_upside_scoring():
    """Verify opportunity expansion scoring with deal and funding values."""
    res_opp = calculate_signal_priority(
        signal_id="hiring_funding_event",
        severity="medium",
        company_tier="tier_2",
        role="CTO",
        commercial_value=120_000,
        metadata_payload={"funding_amount": 15_000_000},
    )

    assert res_opp.effective_polarity == "opportunity"
    assert res_opp.business_impact_score == 25  # >= 100k
    assert res_opp.account_importance_score == 18  # Tier 2
    assert res_opp.relationship_context_score == 22  # CTO
    assert res_opp.total_score >= 70


def test_prioritization_p0_critical_override():
    """Verify that P0 override triggers for critical SLA breaches on strategic accounts."""
    res_p0 = calculate_signal_priority(
        signal_id="unanswered_conversation",
        severity="critical",
        company_tier="strategic",
        is_client=True,
        role="CEO",
        days_elapsed=8,  # >7d SLA breach
        commercial_value=10_000,
    )

    assert res_p0.priority_tier == SignalPriorityTier.P0
    assert res_p0.total_score >= 90
    assert "Critical Inbound SLA Breach" in res_p0.impact_rationale


def test_prioritization_low_tier_p4():
    """Verify that low-impact weak signals receive P3/P4 classification."""
    res_p4 = calculate_signal_priority(
        signal_id="dormant_strategic_account",
        severity="low",
        company_tier=None,
        is_client=False,
        role=None,
        days_elapsed=10,
        commercial_value=0,
    )

    assert res_p4.priority_tier in (SignalPriorityTier.P3, SignalPriorityTier.P4)
    assert res_p4.total_score < 50


@pytest.mark.asyncio
async def test_upsert_stores_priority_score_and_breakdown(db_session: AsyncSession):
    """Verify upsert_detected_signal populates priority score in DetectedSignal.score and metadata."""
    company = Company(
        name="High Impact Corp",
        domain="highimpact.io",
        attributes={"tier": "strategic", "segment": "clients_and_prospects"},
    )
    db_session.add(company)
    await db_session.flush()

    person = Person(
        first_name="Jane",
        last_name="Executive",
        primary_email="jane@highimpact.io",
        attributes={"role": "Chief Technology Officer"},
    )
    db_session.add(person)
    await db_session.flush()

    sig, is_new = await upsert_detected_signal(
        db_session,
        signal_id="unanswered_conversation",
        title="Unanswered Conversation: Jane Executive",
        severity="critical",
        company_id=company.id,
        person_id=person.id,
        score=Decimal("0.95"),  # Confidence score
        metadata_payload={
            "days_unanswered": 7,
            "person_role": "Chief Technology Officer",
            "is_client": True,
            "commercial_value": 75000,
        },
    )
    await db_session.commit()

    assert is_new is True
    # Priority score is populated (>= 90 for P0)
    assert float(sig.score) >= 90.0
    assert sig.metadata_payload["priority_tier"] == "P0"
    assert sig.metadata_payload["effective_polarity"] == "risk"
    assert "priority_breakdown" in sig.metadata_payload
    assert sig.metadata_payload["priority_breakdown"]["total_score"] >= 90


@pytest.mark.asyncio
async def test_api_list_sorts_by_priority_by_default(db_session: AsyncSession):
    """Verify list_detected_signals orders by priority score descending by default."""
    c_low = Company(name="Small Co", domain="small.io", attributes={"tier": "tier_3"})
    c_high = Company(
        name="Mega Strategic Co", domain="megacorp.io", attributes={"tier": "strategic"}
    )
    db_session.add_all([c_low, c_high])
    await db_session.flush()

    # Create low priority signal
    sig_low, _ = await upsert_detected_signal(
        db_session,
        signal_id="dormant_strategic_account",
        title="Small Co Inactive",
        severity="low",
        company_id=c_low.id,
        metadata_payload={"days_inactive": 10},
    )

    # Create high priority signal
    sig_high, _ = await upsert_detected_signal(
        db_session,
        signal_id="unanswered_conversation",
        title="Mega Corp Unanswered Critical",
        severity="critical",
        company_id=c_high.id,
        metadata_payload={
            "days_unanswered": 8,
            "person_role": "VP Engineering",
            "is_client": True,
            "commercial_value": 150000,
        },
    )
    await db_session.commit()

    results, total = await list_detected_signals(db_session, sort_by="priority")
    assert total >= 2
    # First item should be the high priority one
    assert results[0].id == sig_high.id
    assert results[0].priority_tier in ("P0", "P1")
    assert results[0].priority_score >= results[1].priority_score
