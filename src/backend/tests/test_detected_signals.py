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
async def test_api_signals_triage_flow(client: AsyncClient, auth_headers: dict[str, str]):
    """Test full API evaluation, listing, stats, and triage state updates."""
    # 1. Trigger evaluation endpoint
    eval_res = await client.post("/api/v1/signals/evaluate", headers=auth_headers)
    assert eval_res.status_code == 200
    eval_body = eval_res.json()
    assert eval_body["status"] == "success"

    # 2. Stats endpoint
    stats_res = await client.get("/api/v1/signals/detected/stats", headers=auth_headers)
    assert stats_res.status_code == 200
    stats_body = stats_res.json()
    assert "total_active" in stats_body

    # 3. List detected signals
    list_res = await client.get("/api/v1/signals/detected", headers=auth_headers)
    assert list_res.status_code == 200
    list_body = list_res.json()
    assert "data" in list_body and "pagination" in list_body

    if len(list_body["data"]) > 0:
        sig_id = list_body["data"][0]["id"]

        # 4. Patch status to acknowledged
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

    # 6. Patch non-existent signal returns 404
    fake_id = str(uuid.uuid4())
    fake_res = await client.patch(
        f"/api/v1/signals/detected/{fake_id}",
        headers=auth_headers,
        json={"status": "dismissed"},
    )
    assert fake_res.status_code == 404
    assert fake_res.json()["error"]["code"] == "NOT_FOUND"
