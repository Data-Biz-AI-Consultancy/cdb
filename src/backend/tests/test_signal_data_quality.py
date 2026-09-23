from decimal import Decimal

from cdb.services.signals.classification.confidence import SignalConfidenceTier, assess_confidence
from cdb.services.signals.classification.evidence import (
    EvidenceStatus,
    determine_evidence_status,
)
from cdb.services.signals.classification.quality import (
    DataQualityFlag,
    SourceReliability,
    evaluate_source_data_quality,
)


def test_evaluate_source_data_quality_healthy():
    """Verify healthy source data receives high reliability and zero quality penalties."""
    assessment = evaluate_source_data_quality(
        signal_id="dormant_strategic_account",
        days_elapsed=15,
        max_fresh_days=60,
        has_company=True,
        has_contact_role=True,
        is_connector_active=True,
        is_confidential=False,
        confidence_score=Decimal("0.85"),
        source_reliability=SourceReliability.HIGH,
    )

    assert assessment.source_reliability == SourceReliability.HIGH
    assert assessment.has_quality_warning is False
    assert assessment.is_suppressed is False
    assert assessment.confidence_penalty == Decimal("0.00")
    assert len(assessment.data_quality_flags) == 0


def test_evaluate_source_data_quality_staleness():
    """Verify stale data (exceeding staleness threshold) triggers staleness flag and penalty."""
    assessment = evaluate_source_data_quality(
        signal_id="dormant_strategic_account",
        days_elapsed=120,
        max_fresh_days=60,
        has_company=True,
        has_contact_role=True,
        is_connector_active=True,
        is_confidential=False,
        confidence_score=Decimal("0.75"),
    )

    assert assessment.has_quality_warning is True
    assert DataQualityFlag.STALE_SOURCE.value in assessment.data_quality_flags
    assert assessment.confidence_penalty >= Decimal("0.10")
    assert assessment.is_suppressed is False


def test_evaluate_source_data_quality_missing_fatal_fields():
    """Verify missing required company triggers hard suppression and flag."""
    assessment = evaluate_source_data_quality(
        signal_id="expiring_contract",
        has_company=False,
        has_contact_role=False,
        is_connector_active=True,
        confidence_score=Decimal("0.50"),
    )

    assert assessment.has_quality_warning is True
    assert DataQualityFlag.MISSING_ATTRIBUTES.value in assessment.data_quality_flags
    assert assessment.is_suppressed is True
    assert assessment.confidence_penalty >= Decimal("0.30")


def test_evaluate_source_data_quality_restricted_data():
    """Verify restricted source data redacts excerpts and flags data privacy disclosure."""
    assessment = evaluate_source_data_quality(
        signal_id="leadership_change",
        is_confidential=True,
        raw_excerpt="Secret merger discussion with CEO",
        confidence_score=Decimal("0.80"),
    )

    assert assessment.source_reliability == SourceReliability.RESTRICTED
    assert DataQualityFlag.RESTRICTED_DATA.value in assessment.data_quality_flags
    assert assessment.has_quality_warning is True
    assert assessment.processed_excerpt == "[REDACTED - Confidential Context]"


def test_evaluate_source_data_quality_low_reliability_source():
    """Verify LOW source reliability triggers flag, penalty, and warning."""
    assessment = evaluate_source_data_quality(
        signal_id="competitor_signal",
        source_reliability=SourceReliability.LOW,
        confidence_score=Decimal("0.60"),
    )

    assert assessment.source_reliability == SourceReliability.LOW
    assert assessment.has_quality_warning is True
    assert DataQualityFlag.LOW_RELIABILITY_SOURCE.value in assessment.data_quality_flags
    assert assessment.confidence_penalty >= Decimal("0.15")


def test_determine_evidence_status_with_safeguards():
    """Verify determine_evidence_status properly flags restricted and unavailable source data."""
    status_restricted, notes_restr = determine_evidence_status(is_restricted=True)
    assert status_restricted == EvidenceStatus.RESTRICTED.value
    assert any("restricted" in n.lower() for n in notes_restr)

    status_unavail, notes_unavail = determine_evidence_status(is_unavailable=True)
    assert status_unavail == EvidenceStatus.UNAVAILABLE.value
    assert any("unavailable" in n.lower() for n in notes_unavail)


def test_assess_confidence_with_quality_penalty():
    """Verify confidence assessment applies quality penalty and flags low-quality warnings."""
    score, tier, is_uncertain, reasons = assess_confidence(
        score=Decimal("0.85"),
        quality_flags=["stale_source"],
        confidence_penalty=Decimal("0.20"),
    )

    assert score == Decimal("0.65")
    assert tier == SignalConfidenceTier.MEDIUM
    assert any("stale_source" in r for r in reasons)
