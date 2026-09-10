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
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.user import User
from cdb.services.signals.catalog import ensure_signals_dimension
from cdb.services.signals.detector import (
    detect_competitor_signals,
    detect_dormant_strategic_accounts,
    detect_expiring_contracts,
    detect_hiring_funding_events,
    detect_leadership_changes,
    detect_unanswered_conversations,
    evaluate_all_signals,
)


@pytest.fixture
async def auth_headers(db_session: AsyncSession) -> dict[str, str]:
    user = User(
        email="detector_tester@example.com",
        hashed_pw="hashed_pw",
        full_name="Detector Tester",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_detect_dormant_strategic_accounts(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    # Create strategic company (signed engagement)
    company = Company(name="Dormant Client Corp", domain="dormantcorp.com")
    db_session.add(company)
    await db_session.flush()

    eng = Engagement(
        title="Data Warehouse Modernization",
        company_id=company.id,
        contract_status="signed",
        status="completed",
        rate_type="daily",
        currency="EUR",
    )
    db_session.add(eng)

    # Activity 75 days ago
    past_activity = Activity(
        company_id=company.id,
        type="meeting",
        source="notion",
        occurred_at=now - datetime.timedelta(days=75),
        title="Wrap-up retrospective",
    )
    db_session.add(past_activity)
    await db_session.commit()

    results = await detect_dormant_strategic_accounts(db_session, now)
    assert len(results) >= 1
    sig, is_new = next(s for s in results if s[0].company_id == company.id)
    assert is_new is True
    assert sig.signal_id == "dormant_strategic_account"
    assert sig.severity == "high"
    assert sig.metadata_payload["days_inactive"] >= 74


@pytest.mark.asyncio
async def test_detect_expiring_contracts(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    company = Company(name="Expiring Client AG", domain="expiring.de")
    db_session.add(company)
    await db_session.flush()

    eng = Engagement(
        title="Fractional Head of Data",
        company_id=company.id,
        contract_status="signed",
        status="active",
        rate_type="monthly",
        currency="EUR",
        rate_value=Decimal("8000.00"),
        expected_end_date=(now + datetime.timedelta(days=20)).date(),
    )
    db_session.add(eng)
    await db_session.commit()

    results = await detect_expiring_contracts(db_session, now)
    assert len(results) >= 1
    sig, is_new = next(s for s in results if s[0].engagement_id == eng.id)
    assert sig.signal_id == "expiring_contract"
    assert sig.severity == "high"
    assert sig.metadata_payload["days_left"] <= 20


@pytest.mark.asyncio
async def test_detect_unanswered_conversations(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    person = Person(
        first_name="Jane",
        last_name="Prospect",
        primary_email="jane.prospect@example.com",
    )
    db_session.add(person)
    await db_session.flush()

    # Message from Jane 5 days ago with no reply
    msg = Activity(
        person_id=person.id,
        type="linkedin_message",
        source="linkedin",
        occurred_at=now - datetime.timedelta(days=5),
        title="Inbound proposal request",
        raw_content="Can we talk about your consulting rates?",
    )
    db_session.add(msg)
    await db_session.commit()

    results = await detect_unanswered_conversations(db_session, now)
    assert len(results) >= 1
    sig, is_new = next(s for s in results if s[0].person_id == person.id)
    assert sig.signal_id == "unanswered_conversation"
    assert sig.metadata_payload["days_unanswered"] >= 4


@pytest.mark.asyncio
async def test_detect_leadership_changes(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    company = Company(name="Tech Growth GmbH", domain="techgrowth.de")
    person = Person(first_name="Marcus", last_name="Vance")
    db_session.add_all([company, person])
    await db_session.flush()

    # New CTO relationship started 25 days ago
    rel = PersonCompanyRelationship(
        person_id=person.id,
        company_id=company.id,
        title="Chief Technology Officer (CTO)",
        is_current=True,
        started_at=(now - datetime.timedelta(days=25)).date(),
    )
    db_session.add(rel)
    await db_session.commit()

    results = await detect_leadership_changes(db_session, now)
    assert len(results) >= 1
    sig, is_new = next(s for s in results if s[0].person_id == person.id)
    assert sig.signal_id == "leadership_change"
    assert sig.metadata_payload["event_type"] == "new_hire"


@pytest.mark.asyncio
async def test_detect_hiring_funding_events(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    company = Company(name="Scaleup AI", domain="scaleup.ai")
    db_session.add(company)
    await db_session.flush()

    act = Activity(
        company_id=company.id,
        type="meeting",
        source="notion",
        occurred_at=now - datetime.timedelta(days=10),
        title="Intro call with Founder",
        raw_content="They just closed their Series A funding round and are hiring data engineers rapidly.",
    )
    db_session.add(act)
    await db_session.commit()

    results = await detect_hiring_funding_events(db_session, now)
    assert len(results) >= 1
    sig, is_new = next(s for s in results if s[0].company_id == company.id)
    assert sig.signal_id == "hiring_funding_event"


@pytest.mark.asyncio
async def test_detect_competitor_signals(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    company = Company(name="Enterprise Co", domain="enterprise.com")
    db_session.add(company)
    await db_session.flush()

    act = Activity(
        company_id=company.id,
        type="meeting",
        source="notion",
        occurred_at=now - datetime.timedelta(days=15),
        title="Architecture Discussion",
        raw_content="Client mentioned they are evaluating alternative options in a bake-off against another consultancy.",
    )
    db_session.add(act)
    await db_session.commit()

    results = await detect_competitor_signals(db_session, now)
    assert len(results) >= 1
    sig, is_new = next(s for s in results if s[0].company_id == company.id)
    assert sig.signal_id == "competitor_signal"


@pytest.mark.asyncio
async def test_evaluate_all_signals_and_idempotency(db_session: AsyncSession):
    """Test full evaluation pipeline and verify idempotency on rerun."""
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    company = Company(name="Idempotent Test Corp", domain="idempotent.com")
    db_session.add(company)
    await db_session.flush()

    eng = Engagement(
        title="Big Data Advisory",
        company_id=company.id,
        contract_status="signed",
        status="active",
        expected_end_date=(now + datetime.timedelta(days=15)).date(),
    )
    db_session.add(eng)
    await db_session.commit()

    # 1. First run
    run1 = await evaluate_all_signals(db_session)
    assert run1["status"] == "success"
    assert run1["new_signals_detected"] >= 1
    first_new = run1["new_signals_detected"]

    # 2. Second run immediately after
    run2 = await evaluate_all_signals(db_session)
    assert run2["status"] == "success"
    assert run2["new_signals_detected"] == 0
    assert run2["refreshed_signals"] == first_new


@pytest.mark.asyncio
async def test_detect_leadership_departure(db_session: AsyncSession):
    """Test departure of an executive/champion from a client company."""
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    company = Company(name="Departure Client Ltd", domain="departure.co.uk")
    person = Person(first_name="Sarah", last_name="Connor")
    db_session.add_all([company, person])
    await db_session.flush()

    rel = PersonCompanyRelationship(
        person_id=person.id,
        company_id=company.id,
        title="VP of Engineering",
        is_current=False,
        ended_at=(now - datetime.timedelta(days=14)).date(),
    )
    db_session.add(rel)
    await db_session.commit()

    results = await detect_leadership_changes(db_session, now)
    dep_results = [r for r in results if r[0].person_id == person.id]
    assert len(dep_results) >= 1
    sig, is_new = dep_results[0]
    assert sig.signal_id == "leadership_change"
    assert sig.metadata_payload["event_type"] == "departure"
    assert "left" in sig.title


@pytest.mark.asyncio
async def test_detect_critical_dormancy_and_zero_activities(db_session: AsyncSession):
    """Test critical dormancy (>90d inactive) and accounts with zero recorded activities."""
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    # 1. Company with zero activities
    company_no_act = Company(name="Zero Activity Co", domain="zeroact.com")
    db_session.add(company_no_act)
    await db_session.flush()

    eng1 = Engagement(
        title="Legacy Audit",
        company_id=company_no_act.id,
        contract_status="signed",
        status="completed",
    )
    db_session.add(eng1)

    # 2. Company with activity 105 days ago (> 90d critical)
    company_crit = Company(name="Critical Inactive Corp", domain="crit.com")
    db_session.add(company_crit)
    await db_session.flush()

    eng2 = Engagement(
        title="Advisory Project",
        company_id=company_crit.id,
        contract_status="signed",
        status="completed",
    )
    db_session.add(eng2)

    act = Activity(
        company_id=company_crit.id,
        type="call",
        source="notion",
        occurred_at=now - datetime.timedelta(days=105),
        title="Old project kickoff",
    )
    db_session.add(act)
    await db_session.commit()

    results = await detect_dormant_strategic_accounts(db_session, now)
    crit_sig = next(r[0] for r in results if r[0].company_id == company_crit.id)
    assert crit_sig.severity == "critical"
    assert crit_sig.metadata_payload["days_inactive"] >= 104

    zero_sig = next(r[0] for r in results if r[0].company_id == company_no_act.id)
    assert zero_sig.severity in ["high", "critical"]


@pytest.mark.asyncio
async def test_detect_already_expired_contract(db_session: AsyncSession):
    """Test contract that is already past its expected end date."""
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    company = Company(name="Overdue Contract Co", domain="overdue.com")
    db_session.add(company)
    await db_session.flush()

    eng = Engagement(
        title="Delivery Overdue",
        company_id=company.id,
        contract_status="signed",
        status="in_delivery",
        expected_end_date=(now - datetime.timedelta(days=10)).date(),
    )
    db_session.add(eng)
    await db_session.commit()

    results = await detect_expiring_contracts(db_session, now)
    match = next(r[0] for r in results if r[0].engagement_id == eng.id)
    assert match.signal_id == "expiring_contract"
    assert match.metadata_payload["days_left"] <= 0


@pytest.mark.asyncio
async def test_api_signals_triage_flow(
    client: AsyncClient, auth_headers: dict[str, str], db_session: AsyncSession
):
    """Test full API evaluation, listing, stats, and triage state updates with real seeded entities."""
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    # Seed an entity that will trigger a signal
    company = Company(name="API Triage Corp", domain="apitriage.com")
    person = Person(first_name="Alice", last_name="Buyer", primary_email="alice@apitriage.com")
    db_session.add_all([company, person])
    await db_session.flush()

    # Expiring contract engagement
    eng = Engagement(
        title="Cloud Migration Advisory",
        company_id=company.id,
        contract_status="signed",
        status="active",
        expected_end_date=(now + datetime.timedelta(days=15)).date(),
    )
    db_session.add(eng)

    # Inbound unanswered message
    msg = Activity(
        person_id=person.id,
        type="linkedin_message",
        source="linkedin",
        occurred_at=now - datetime.timedelta(days=5),
        title="Quick sync on rates",
        raw_content="Can we talk about rates for next quarter?",
    )
    db_session.add(msg)
    await db_session.commit()

    # 1. Trigger evaluation endpoint
    eval_res = await client.post("/api/v1/signals/evaluate", headers=auth_headers)
    assert eval_res.status_code == 200
    eval_body = eval_res.json()
    assert eval_body["status"] == "success"
    assert eval_body["new_signals_detected"] >= 2

    # 2. Stats endpoint
    stats_res = await client.get("/api/v1/signals/detected/stats", headers=auth_headers)
    assert stats_res.status_code == 200
    stats_body = stats_res.json()
    assert stats_body["total_active"] >= 2

    # 3. List detected signals with filters
    list_res = await client.get("/api/v1/signals/detected", headers=auth_headers)
    assert list_res.status_code == 200
    list_body = list_res.json()
    assert len(list_body["data"]) >= 2

    # Filter by category=risk
    risk_res = await client.get("/api/v1/signals/detected?category=risk", headers=auth_headers)
    assert risk_res.status_code == 200
    assert all(r["signal"]["category"] == "risk" for r in risk_res.json()["data"])

    # Filter by company_id
    comp_res = await client.get(
        f"/api/v1/signals/detected?company_id={company.id}", headers=auth_headers
    )
    assert comp_res.status_code == 200
    assert any(r["company_id"] == str(company.id) for r in comp_res.json()["data"])

    # Filter by status=active
    act_res = await client.get("/api/v1/signals/detected?status=active", headers=auth_headers)
    assert act_res.status_code == 200

    # 4. Patch status to acknowledged
    sig_id = list_body["data"][0]["id"]
    patch_res = await client.patch(
        f"/api/v1/signals/detected/{sig_id}",
        headers=auth_headers,
        json={"status": "acknowledged", "resolution_notes": "Reviewed in standup"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "acknowledged"

    # 5. Patch status to actioned
    action_res = await client.patch(
        f"/api/v1/signals/detected/{sig_id}",
        headers=auth_headers,
        json={"status": "actioned", "resolution_notes": "Scheduled meeting with client"},
    )
    assert action_res.status_code == 200
    assert action_res.json()["status"] == "actioned"
    assert action_res.json()["actioned_at"] is not None

    # 6. Patch status to dismissed
    dismiss_res = await client.patch(
        f"/api/v1/signals/detected/{sig_id}",
        headers=auth_headers,
        json={"status": "dismissed", "resolution_notes": "Client opted for internal hire"},
    )
    assert dismiss_res.status_code == 200
    assert dismiss_res.json()["status"] == "dismissed"

    # 7. Get single detected signal by ID
    get_res = await client.get(
        f"/api/v1/signals/detected/{sig_id}",
        headers=auth_headers,
    )
    assert get_res.status_code == 200
    get_data = get_res.json()
    assert get_data["id"] == sig_id
    assert get_data["signal_id"] == list_body["data"][0]["signal_id"]
    assert get_data["status"] == "dismissed"

    # 8. Patch & Get non-existent signal returns 404
    fake_id = str(uuid.uuid4())
    fake_patch = await client.patch(
        f"/api/v1/signals/detected/{fake_id}",
        headers=auth_headers,
        json={"status": "dismissed"},
    )
    assert fake_patch.status_code == 404
    assert fake_patch.json()["error"]["code"] == "NOT_FOUND"

    fake_get = await client.get(
        f"/api/v1/signals/detected/{fake_id}",
        headers=auth_headers,
    )
    assert fake_get.status_code == 404
    assert fake_get.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_detected_signal_service_direct_filters_and_updates(db_session: AsyncSession):
    """Directly test detected_signals service methods: stats, multi-filter querying, and state updates."""
    from cdb.schemas.signals import DetectedSignalStatus, DetectedSignalUpdate
    from cdb.services.signals.detected import (
        get_detected_signal,
        get_detected_signal_stats,
        list_detected_signals,
        update_detected_signal,
    )

    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    company = Company(name="Direct Service Corp", domain="direct.com")
    person = Person(first_name="Bob", last_name="Direct")
    db_session.add_all([company, person])
    await db_session.flush()

    eng = Engagement(
        title="Direct Engagement",
        company_id=company.id,
        contract_status="signed",
        status="active",
        expected_end_date=(now + datetime.timedelta(days=10)).date(),
    )
    db_session.add(eng)
    await db_session.commit()

    # 1. Run evaluation to detect signal
    res = await evaluate_all_signals(db_session)
    assert res["status"] == "success"

    # 2. Test get_detected_signal_stats directly
    stats = await get_detected_signal_stats(db_session)
    assert stats.total_active >= 1
    assert len(stats.by_severity) > 0
    assert len(stats.by_category) > 0
    assert len(stats.by_signal) > 0

    # 3. Test list_detected_signals with every individual filter
    items, total = await list_detected_signals(db_session, signal_id="expiring_contract")
    assert total >= 1
    target_sig = items[0]

    items_sev, _ = await list_detected_signals(db_session, severity=target_sig.severity)
    assert len(items_sev) >= 1

    items_stat, _ = await list_detected_signals(db_session, status=DetectedSignalStatus.ACTIVE)
    assert len(items_stat) >= 1

    items_comp, _ = await list_detected_signals(db_session, company_id=company.id)
    assert len(items_comp) >= 1

    items_eng, _ = await list_detected_signals(db_session, engagement_id=eng.id)
    assert len(items_eng) >= 1

    items_pers, _ = await list_detected_signals(db_session, person_id=person.id)
    assert isinstance(items_pers, list)

    items_opp, _ = await list_detected_signals(db_session, opportunity_id=uuid.uuid4())
    assert isinstance(items_opp, list)

    items_cat, _ = await list_detected_signals(db_session, category="hybrid")
    assert len(items_cat) >= 1

    # 4. Test update_detected_signal directly: acknowledged, actioned, dismissed
    ack_res = await update_detected_signal(
        db_session,
        target_sig.id,
        DetectedSignalUpdate(
            status=DetectedSignalStatus.ACKNOWLEDGED, resolution_notes="Acknowledged in review"
        ),
    )
    assert ack_res is not None
    assert ack_res.status == DetectedSignalStatus.ACKNOWLEDGED

    act_res = await update_detected_signal(
        db_session,
        target_sig.id,
        DetectedSignalUpdate(
            status=DetectedSignalStatus.ACTIONED, resolution_notes="Contract extended 6 months"
        ),
    )
    assert act_res is not None
    assert act_res.status == DetectedSignalStatus.ACTIONED
    assert act_res.actioned_at is not None

    # Test get_detected_signal directly
    single_sig = await get_detected_signal(db_session, target_sig.id)
    assert single_sig is not None
    assert single_sig.id == target_sig.id
    assert single_sig.signal_id == "expiring_contract"
    assert single_sig.company_name == "Direct Service Corp"

    none_sig = await get_detected_signal(db_session, uuid.uuid4())
    assert none_sig is None

    # Test update nonexistent signal returns None
    none_res = await update_detected_signal(
        db_session,
        uuid.uuid4(),
        DetectedSignalUpdate(status=DetectedSignalStatus.DISMISSED),
    )
    assert none_res is None
