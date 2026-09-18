"""
tests/test_signal_classification.py

Comprehensive tests for opportunity and risk classification rules:
- Qualification criteria distinguishing opportunity, risk, and hybrid signals
- Severity levels, confidence thresholds, and scoring heuristics
- Supporting evidence payload contracts
- Uncertainty identification for low-confidence or ambiguous signals
- Multi-entity conflict detection across Company, Opportunity, and Person scopes
- API filtering for uncertain and conflicting signals
"""

import datetime
import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.security import create_access_token
from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.signal import DetectedSignal
from cdb.models.user import User
from cdb.services.signals.catalog import ensure_signals_dimension
from cdb.services.signals.classification import (
    SIGNAL_CLASSIFICATION_RULES,
    ConflictScope,
    EvidenceStatus,
    SignalConfidenceTier,
    SignalPolarity,
    assess_confidence,
    build_evidence_payload,
    detect_signal_conflicts,
    determine_evidence_status,
    resolve_signal_effective_polarity,
)
from cdb.services.signals.detector import evaluate_all_signals


@pytest.fixture
async def auth_headers(db_session: AsyncSession) -> dict[str, str]:
    user = User(
        email="class_tester@example.com",
        hashed_pw="hashed_pw",
        full_name="Classification Tester",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


def test_classification_rules_catalog_coverage():
    """All 6 catalog signals must have comprehensive classification rules defined."""
    expected_ids = {
        "dormant_strategic_account",
        "unanswered_conversation",
        "expiring_contract",
        "leadership_change",
        "hiring_funding_event",
        "competitor_signal",
    }
    assert set(SIGNAL_CLASSIFICATION_RULES.keys()) == expected_ids

    for sig_id, rule in SIGNAL_CLASSIFICATION_RULES.items():
        assert rule.signal_id == sig_id
        assert rule.name
        assert rule.qualification_criteria
        assert rule.required_evidence_type
        assert rule.default_severity in ("critical", "high", "medium", "low")
        assert len(rule.severity_conditions) > 0
        assert rule.confidence_rationale


def test_qualification_criteria_polarities():
    """Opportunity signals are clearly distinguished from Risk and Hybrid signals."""
    opp_rule = SIGNAL_CLASSIFICATION_RULES["hiring_funding_event"]
    assert opp_rule.base_category == SignalPolarity.OPPORTUNITY

    risk_rules = [
        SIGNAL_CLASSIFICATION_RULES["dormant_strategic_account"],
        SIGNAL_CLASSIFICATION_RULES["unanswered_conversation"],
        SIGNAL_CLASSIFICATION_RULES["competitor_signal"],
    ]
    for r in risk_rules:
        assert r.base_category == SignalPolarity.RISK

    hybrid_rules = [
        SIGNAL_CLASSIFICATION_RULES["expiring_contract"],
        SIGNAL_CLASSIFICATION_RULES["leadership_change"],
    ]
    for r in hybrid_rules:
        assert r.base_category == SignalPolarity.HYBRID


def test_resolve_signal_effective_polarity():
    """Hybrid signals resolve into specific Opportunity vs Risk based on event context."""
    # Leadership change
    dep_pol = resolve_signal_effective_polarity("leadership_change", {"event_type": "departure"})
    assert dep_pol == SignalPolarity.RISK

    hire_pol = resolve_signal_effective_polarity("leadership_change", {"event_type": "new_hire"})
    assert hire_pol == SignalPolarity.OPPORTUNITY

    # Expiring contract
    urgent_pol = resolve_signal_effective_polarity("expiring_contract", {"days_left": 10})
    assert urgent_pol == SignalPolarity.RISK

    upsell_pol = resolve_signal_effective_polarity("expiring_contract", {"days_left": 45})
    assert upsell_pol == SignalPolarity.OPPORTUNITY

    # Direct polarity
    assert resolve_signal_effective_polarity("hiring_funding_event") == SignalPolarity.OPPORTUNITY
    assert resolve_signal_effective_polarity("competitor_signal") == SignalPolarity.RISK


def test_assess_confidence_and_uncertainty():
    """Confidence scoring assigns correct tiers and flags uncertain signals."""
    # High confidence (>= 0.80)
    score, tier, is_uncert, reasons = assess_confidence(Decimal("0.90"))
    assert score == Decimal("0.90")
    assert tier == SignalConfidenceTier.HIGH
    assert not is_uncert
    assert len(reasons) == 0

    # Medium confidence (0.50 - 0.79)
    score, tier, is_uncert, reasons = assess_confidence(Decimal("0.65"))
    assert tier == SignalConfidenceTier.MEDIUM
    assert not is_uncert

    # Low confidence (< 0.50): MUST be flagged as uncertain
    score, tier, is_uncert, reasons = assess_confidence(Decimal("0.40"))
    assert tier == SignalConfidenceTier.LOW
    assert is_uncert
    assert len(reasons) > 0
    assert "verification threshold" in reasons[0]

    # Explicit ambiguity flags
    score, tier, is_uncert, reasons = assess_confidence(
        Decimal("0.45"), ambiguity_flags=["Evidence is 75 days old"]
    )
    assert is_uncert
    assert "Evidence is 75 days old" in reasons


def test_build_evidence_payload_contract():
    """Evidence payload adheres to standardized schema with rich explanations and context."""
    evidence = build_evidence_payload(
        evidence_type="text_pattern",
        source_entity_type="activity",
        source_entity_id="act-12345",
        source_display="Email: Competitor Evaluation",
        trigger_event_title="Competitor bake-off keyword detected",
        why_it_matters_now="Competitor presence in active deal threatens win rate.",
        occurred_at="2026-09-01T10:00:00Z",
        days_elapsed=8,
        excerpt="evaluating alternative consultancy",
        commercial_context={"deal_size": 50000, "currency": "USD"},
        relationship_context={"role": "VP Engineering"},
        key_metrics={"matched_phrase": "evaluating alternative", "is_named": False},
        verification_status="probable",
    )
    assert evidence["evidence_type"] == "text_pattern"
    assert evidence["source_entity_type"] == "activity"
    assert evidence["source_entity_id"] == "act-12345"
    assert evidence["source_display"] == "Email: Competitor Evaluation"
    assert evidence["trigger_event_title"] == "Competitor bake-off keyword detected"
    assert (
        evidence["why_it_matters_now"] == "Competitor presence in active deal threatens win rate."
    )
    assert evidence["occurred_at"] == "2026-09-01T10:00:00Z"
    assert evidence["days_elapsed"] == 8
    assert evidence["excerpt"] == "evaluating alternative consultancy"
    assert evidence["evidence_status"] == "fresh"
    assert evidence["commercial_context"]["deal_size"] == 50000
    assert evidence["relationship_context"]["role"] == "VP Engineering"
    assert evidence["key_metrics"]["is_named"] is False
    assert evidence["verification_status"] == "probable"


def test_determine_evidence_status_evaluations():
    """determine_evidence_status accurately identifies fresh, stale, incomplete, conflicting, and unverified states."""
    # 1. Fresh evidence
    status, notes = determine_evidence_status(days_elapsed=10, max_fresh_days=60)
    assert status == EvidenceStatus.FRESH.value
    assert len(notes) == 0

    # 2. Stale evidence (> max_fresh_days)
    status, notes = determine_evidence_status(days_elapsed=75, max_fresh_days=60)
    assert status == EvidenceStatus.STALE.value
    assert len(notes) > 0
    assert "75 days old" in notes[0]

    # 3. Incomplete evidence (missing required context)
    status, notes = determine_evidence_status(missing_required=True)
    assert status == EvidenceStatus.INCOMPLETE.value
    assert "lacks complete counterparty" in notes[0]

    # 4. Conflicting evidence (opposing polarity)
    status, notes = determine_evidence_status(has_conflict=True)
    assert status == EvidenceStatus.CONFLICTING.value
    assert "Opposing commercial polarity" in notes[0]

    # 5. Unverified / uncertain evidence
    status, notes = determine_evidence_status(verification_status="unverified")
    assert status == EvidenceStatus.UNVERIFIED.value
    assert "unverified or ambiguous" in notes[0]


def test_detect_signal_conflicts_company_level():
    """Conflict detection identifies opposing Opportunity vs Risk signals for the same Company."""
    comp_id = uuid.uuid4()

    sig_risk = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="dormant_strategic_account",
        company_id=comp_id,
        title="Dormant Account",
        status="active",
        metadata_payload={"days_inactive": 70},
    )
    sig_opp = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="hiring_funding_event",
        company_id=comp_id,
        title="Funding Round Announced",
        status="active",
        metadata_payload={"event_type": "funding"},
    )

    conflicts = detect_signal_conflicts([sig_risk, sig_opp])

    risk_res = conflicts[str(sig_risk.id)]
    opp_res = conflicts[str(sig_opp.id)]

    assert risk_res["has_conflict"] is True
    assert risk_res["conflict_scope"] == ConflictScope.COMPANY.value
    assert str(sig_opp.id) in risk_res["conflicting_signal_ids"]
    assert "Company-level conflict" in risk_res["conflict_summary"]

    assert opp_res["has_conflict"] is True
    assert opp_res["conflict_scope"] == ConflictScope.COMPANY.value
    assert str(sig_risk.id) in opp_res["conflicting_signal_ids"]


def test_detect_signal_conflicts_opportunity_level():
    """Conflict detection identifies opposing signals for the same Opportunity deal."""
    opp_id = uuid.uuid4()

    sig_opp = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="expiring_contract",
        opportunity_id=opp_id,
        title="Contract Extension Window",
        status="active",
        metadata_payload={"days_left": 45},  # Opportunity polarity (> 14 days)
    )
    sig_risk = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="competitor_signal",
        opportunity_id=opp_id,
        title="Competitor Bake-off",
        status="active",
        metadata_payload={"matched_phrase": "bake-off"},  # Risk polarity
    )

    conflicts = detect_signal_conflicts([sig_opp, sig_risk])

    assert conflicts[str(sig_opp.id)]["has_conflict"] is True
    assert conflicts[str(sig_opp.id)]["conflict_scope"] == ConflictScope.OPPORTUNITY.value
    assert "Opportunity-level conflict" in conflicts[str(sig_opp.id)]["conflict_summary"]

    assert conflicts[str(sig_risk.id)]["has_conflict"] is True


def test_detect_signal_conflicts_person_level():
    """Conflict detection identifies dropped thread vs departure conflict on Person."""
    person_id = uuid.uuid4()

    sig_unanswered = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="unanswered_conversation",
        person_id=person_id,
        title="Unanswered Thread",
        status="active",
        metadata_payload={"days_unanswered": 5},  # Risk
    )
    sig_departed = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="leadership_change",
        person_id=person_id,
        title="Leadership Transitioned",
        status="active",
        metadata_payload={
            "event_type": "new_hire"
        },  # Opportunity: role transition at target account
    )

    conflicts = detect_signal_conflicts([sig_unanswered, sig_departed])

    assert conflicts[str(sig_unanswered.id)]["has_conflict"] is True
    assert conflicts[str(sig_unanswered.id)]["conflict_scope"] == ConflictScope.PERSON.value
    assert "Person-level conflict" in conflicts[str(sig_unanswered.id)]["conflict_summary"]


def test_detect_signal_conflicts_no_conflict_when_same_polarity():
    """Two Risk signals on the same company should NOT trigger a polarity conflict."""
    comp_id = uuid.uuid4()

    sig_risk1 = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="dormant_strategic_account",
        company_id=comp_id,
        title="Dormant Account",
        status="active",
        metadata_payload={"days_inactive": 70},
    )
    sig_risk2 = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="competitor_signal",
        company_id=comp_id,
        title="Competitor Mentioned",
        status="active",
        metadata_payload={"matched_phrase": "alternative consultancy"},
    )

    conflicts = detect_signal_conflicts([sig_risk1, sig_risk2])

    assert conflicts[str(sig_risk1.id)]["has_conflict"] is False
    assert conflicts[str(sig_risk2.id)]["has_conflict"] is False


@pytest.mark.asyncio
async def test_end_to_end_conflict_and_uncertainty_evaluation(
    db_session: AsyncSession, client: AsyncClient, auth_headers: dict[str, str]
):
    """
    Evaluates end-to-end detection where a company triggers both
    dormant_strategic_account (Risk) and hiring_funding_event (Opportunity),
    confirming conflict tagging, confidence scoring, evidence contracts, and API filtering.
    """
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    # 1. Create a company qualifying as strategic (signed engagement)
    company = Company(
        name="Dual Conflict Corp",
        domain="dualconflict.com",
        attributes={"segment": "clients_and_prospects"},
    )
    db_session.add(company)
    await db_session.flush()

    eng = Engagement(
        title="Legacy Data Platform",
        company_id=company.id,
        contract_status="signed",
        status="completed",
        rate_type="daily",
        currency="EUR",
        rate_value=Decimal("1200.00"),
    )
    db_session.add(eng)

    # Activity 1: Very old touchpoint (95 days ago) -> Triggers Dormant Strategic Account
    old_dt = now - datetime.timedelta(days=95)
    act_old = Activity(
        type="meeting",
        source="notion",
        company_id=company.id,
        title="Old QBR",
        summary="Past review meeting",
        occurred_at=old_dt,
    )
    db_session.add(act_old)

    # Activity 2: Market funding mention (65 days ago: >60d so account is dormant, but <90d so funding is detected)
    recent_dt = now - datetime.timedelta(days=65)
    act_funding = Activity(
        type="email",
        source="email",
        company_id=company.id,
        title="Funding Update",
        summary="Company announced they raised Series B capital round and are scaling data team",
        occurred_at=recent_dt,
    )
    db_session.add(act_funding)
    await db_session.commit()

    # 2. Run master evaluation
    eval_result = await evaluate_all_signals(db_session)
    assert eval_result["status"] == "success"
    assert eval_result["total_active_signals"] >= 1

    # 3. Fetch detected stats through API
    stats_res = await client.get("/api/v1/signals/detected/stats", headers=auth_headers)
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    assert "total_conflicting" in stats_data
    assert "total_uncertain" in stats_data

    # 4. Fetch list of detected signals with conflict
    list_res = await client.get(
        f"/api/v1/signals/detected?company_id={company.id}", headers=auth_headers
    )
    assert list_res.status_code == 200
    signals_data = list_res.json()["data"]
    assert len(signals_data) >= 1

    # Check evidence contract and confidence fields on returned items
    for item in signals_data:
        assert item["confidence_score"] is not None
        assert item["confidence_tier"] in ("high", "medium", "low")
        assert "evidence" in item
        assert item["evidence"]["evidence_type"] is not None
        assert "verification_status" in item["evidence"]
        assert item["evidence"]["evidence_status"] in (
            "fresh",
            "stale",
            "incomplete",
            "conflicting",
            "unverified",
        )
        assert item["evidence"]["trigger_event_title"] is not None
        assert item["why_it_matters_now"] is not None

    # 5. Query specifically with has_conflict=true
    conflict_res = await client.get(
        "/api/v1/signals/detected?has_conflict=true", headers=auth_headers
    )
    assert conflict_res.status_code == 200
    conflict_items = conflict_res.json()["data"]
    assert len(conflict_items) >= 2
    for c_item in conflict_items:
        assert c_item["has_conflict"] is True
        assert len(c_item["conflicting_signal_ids"]) > 0
        assert "Company-level conflict" in c_item["conflict_summary"]
