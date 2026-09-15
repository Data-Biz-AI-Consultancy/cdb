"""
tests/test_signal_subsystems.py

Unit and integration tests covering the refactored signal subpackages:
- cdb.services.signals.catalog (service, data, summary, filters)
- cdb.services.signals.detected (linking, unlinking, lifecycle, mapper, query stats)
- cdb.services.signals.detectors (growth, leadership, unanswered, competitors, dormant, contracts)
- cdb.services.signals.utils (fetch_active_companies, format_days_remaining_label)
"""

import datetime
import uuid
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.person import Person
from cdb.models.signal import DetectedSignal
from cdb.models.user import User
from cdb.schemas.signals import (
    DetectedSignalStatus,
    DetectedSignalUpdate,
    SignalCategory,
    SignalSeverity,
    SignalTargetEntity,
)
from cdb.services.signals.catalog import (
    INITIAL_SIGNAL_CATALOG,
    compute_catalog_summary,
    ensure_signals_dimension,
    get_catalog_response,
    get_signal_by_id,
    get_signals_from_db,
)
from cdb.services.signals.detected import (
    link_person_to_detected_signal,
    retire_stale_detected_signals,
    unlink_person_from_detected_signal,
    update_detected_signal,
)
from cdb.services.signals.detectors.contracts import (
    fetch_expiring_engagements,
)
from cdb.services.signals.utils import (
    fetch_active_companies,
    format_days_remaining_label,
)


@pytest.mark.asyncio
async def test_catalog_subpackage_service(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    assert len(INITIAL_SIGNAL_CATALOG) >= 6

    # Fetch with filters
    risk_signals = await get_signals_from_db(db_session, category=SignalCategory.RISK)
    assert len(risk_signals) > 0
    assert all(s.category == "risk" for s in risk_signals)

    comp_signals = await get_signals_from_db(db_session, target_entity=SignalTargetEntity.COMPANY)
    assert len(comp_signals) > 0
    assert all(s.target_entity == "company" for s in comp_signals)

    high_signals = await get_signals_from_db(db_session, severity=SignalSeverity.HIGH)
    assert len(high_signals) > 0

    # Get single signal
    dormant_def = await get_signal_by_id(db_session, "dormant_strategic_account")
    assert dormant_def is not None
    assert dormant_def.name == "Dormant Strategic Account"

    # Compute catalog summary
    summary = compute_catalog_summary(risk_signals)
    assert summary.total_signals == len(risk_signals)
    assert "risk" in summary.by_category

    # Get full catalog response with filters
    response = await get_catalog_response(db_session, category=SignalCategory.RISK)
    assert len(response.data) == len(risk_signals)
    assert response.summary.total_signals >= len(risk_signals)


@pytest.mark.asyncio
async def test_detected_person_linking_and_unlinking(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)

    comp = Company(name="Linking Target Corp")
    p1 = Person(first_name="Alice", last_name="Walker", primary_email="alice@example.com")
    p2 = Person(first_name="Bob", last_name="Stone", primary_email="bob@example.com")
    db_session.add_all([comp, p1, p2])
    await db_session.commit()

    sig = DetectedSignal(
        signal_id="dormant_strategic_account",
        company_id=comp.id,
        title="Dormant Account: Linking Corp",
        summary="Test signal",
        status="active",
        severity="high",
        score=Decimal("0.85"),
    )
    db_session.add(sig)
    await db_session.commit()
    await db_session.refresh(sig)

    p1_id = p1.id
    p2_id = p2.id
    sig_id = sig.id

    # Link p1 with role 'decision_maker'
    res1 = await link_person_to_detected_signal(db_session, sig_id, p1_id, role="decision_maker")
    assert res1 is not None
    assert len(res1.connected_persons) == 1
    assert res1.connected_persons[0].id == p1_id
    assert res1.connected_persons[0].role == "decision_maker"

    # Update p1 role to 'sponsor'
    res1_updated = await link_person_to_detected_signal(db_session, sig_id, p1_id, role="sponsor")
    assert res1_updated is not None
    assert res1_updated.connected_persons[0].role == "sponsor"

    # Link p2 with role 'champion'
    res2 = await link_person_to_detected_signal(db_session, sig_id, p2_id, role="champion")
    assert res2 is not None
    assert len(res2.connected_persons) == 2

    # Unlink p1
    res_unlink1 = await unlink_person_from_detected_signal(db_session, sig_id, p1_id)
    assert res_unlink1 is not None
    assert len(res_unlink1.connected_persons) == 1
    assert res_unlink1.connected_persons[0].id == p2_id

    # Unlink non-existent or invalid cases
    assert await link_person_to_detected_signal(db_session, uuid.uuid4(), p1_id) is None
    assert await link_person_to_detected_signal(db_session, sig_id, uuid.uuid4()) is None
    assert await unlink_person_from_detected_signal(db_session, uuid.uuid4(), p1_id) is None


@pytest.mark.asyncio
async def test_detected_lifecycle_and_stale_retirement(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    comp = Company(name="Lifecycle Corp")
    user = User(email="auditor@example.com", hashed_pw="pw", full_name="Auditor User")
    db_session.add_all([comp, user])
    await db_session.commit()

    sig1 = DetectedSignal(
        signal_id="expiring_contract",
        company_id=comp.id,
        title="Expiring Contract Test 1",
        summary="Test summary",
        status="active",
        severity="medium",
        score=Decimal("0.90"),
    )
    sig2 = DetectedSignal(
        signal_id="dormant_strategic_account",
        company_id=comp.id,
        title="Dormant Account Test 2",
        summary="Test summary 2",
        status="active",
        severity="high",
        score=Decimal("0.85"),
    )
    db_session.add_all([sig1, sig2])
    await db_session.commit()

    # Update sig1 to actioned with notes
    update_payload = DetectedSignalUpdate(
        status=DetectedSignalStatus.ACTIONED,
        resolution_notes="Contacted renewal sponsor and prepared proposal SOW.",
    )
    updated = await update_detected_signal(db_session, sig1.id, update_payload, user=user)
    assert updated is not None
    assert updated.status == DetectedSignalStatus.ACTIONED
    assert updated.resolution_notes == update_payload.resolution_notes
    assert updated.actioned_by_id == user.id

    # Retire stale signals (only sig2 remains active, but detected_ids is empty)
    now = datetime.datetime.now(datetime.UTC)
    retired = await retire_stale_detected_signals(
        db=db_session,
        managed_signal_ids=["dormant_strategic_account", "expiring_contract"],
        active_detected_ids={sig1.id},  # sig2 not in active set -> will be retired
        lookback_days=90,
        now=now,
    )
    assert len(retired) == 1
    assert retired[0].id == sig2.id
    assert retired[0].status == "dismissed"
    assert retired[0].metadata_payload.get("auto_retired") is True


@pytest.mark.asyncio
async def test_utils_and_detector_helpers(db_session: AsyncSession):
    # Test date remaining label helper
    assert format_days_remaining_label(14) == "14d remaining"
    assert format_days_remaining_label(0) == "0d remaining"
    assert format_days_remaining_label(-5) == "5d overdue"

    # Test fetch_active_companies
    c1 = Company(name="Active Co 1")
    c2 = Company(name="Deleted Co", deleted_at=datetime.datetime.now(datetime.UTC))
    db_session.add_all([c1, c2])
    await db_session.commit()

    active_comps = await fetch_active_companies(db_session)
    active_ids = {c.id for c in active_comps}
    assert c1.id in active_ids
    assert c2.id not in active_ids

    # Test contract query helper
    today = datetime.date.today()
    eng1 = Engagement(
        title="Active Delivery Engagement",
        company_id=c1.id,
        contract_status="signed",
        status="active",
        expected_end_date=today + datetime.timedelta(days=20),
    )
    db_session.add(eng1)
    await db_session.commit()

    expiring = await fetch_expiring_engagements(db_session, today)
    assert len(expiring) >= 1
    assert eng1.id in {e.id for e in expiring}
