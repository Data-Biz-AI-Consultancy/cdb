import pytest
from httpx import AsyncClient

from cdb.core.security import create_access_token
from cdb.models.user import User


@pytest.fixture
async def auth_headers(db_session) -> dict[str, str]:
    user = User(
        email="dealmaster@example.com",
        hashed_pw="hashed_pw",
        full_name="Deal Master",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_opportunity_full_lifecycle_and_history(
    client: AsyncClient, auth_headers: dict[str, str]
):
    # 1. Test actions dimension endpoint
    actions_resp = await client.get("/api/v1/opportunities/actions", headers=auth_headers)
    assert actions_resp.status_code == 200
    actions = actions_resp.json()
    assert len(actions) >= 10
    action_ids = [a["id"] for a in actions]
    assert "opp_created" in action_ids
    assert "stage_changed" in action_ids
    assert "person_attached" in action_ids
    assert "company_attached" in action_ids
    assert "note_added" in action_ids

    # 2. Create person and company
    person_resp = await client.post(
        "/api/v1/persons",
        headers=auth_headers,
        json={
            "first_name": "Alice",
            "last_name": "Smith",
            "primary_email": "alice.smith@acme.corp",
        },
    )
    assert person_resp.status_code == 201
    person_id = person_resp.json()["id"]

    company_resp = await client.post(
        "/api/v1/companies",
        headers=auth_headers,
        json={"name": "Acme Corp", "domain": "acme.corp"},
    )
    assert company_resp.status_code == 201
    company_id = company_resp.json()["id"]

    # 3. Create opportunity with title, description, and attached person & company
    opp_resp = await client.post(
        "/api/v1/opportunities",
        headers=auth_headers,
        json={
            "title": "Enterprise Cloud Migration",
            "description": "Multi-phase cloud data warehouse migration for Acme Corp.",
            "stage": "prospect",
            "value": "125000.00",
            "currency": "USD",
            "probability": 30,
            "person_ids": [{"person_id": person_id, "role": "decision_maker"}],
            "company_ids": [{"company_id": company_id, "role": "client"}],
        },
    )
    assert opp_resp.status_code == 201
    opp_data = opp_resp.json()
    opp_id = opp_data["id"]
    assert opp_data["title"] == "Enterprise Cloud Migration"
    assert opp_data["description"] == "Multi-phase cloud data warehouse migration for Acme Corp."
    assert opp_data["stage"] == "prospect"
    assert len(opp_data["persons"]) == 1
    assert opp_data["persons"][0]["person_name"] == "Alice Smith"
    assert opp_data["persons"][0]["person_email"] == "alice.smith@acme.corp"
    assert len(opp_data["companies"]) == 1
    assert opp_data["companies"][0]["company_name"] == "Acme Corp"
    assert opp_data["companies"][0]["company_domain"] == "acme.corp"

    # 4. Verify initial history has opp_created
    hist_resp = await client.get(f"/api/v1/opportunities/{opp_id}/history", headers=auth_headers)
    assert hist_resp.status_code == 200
    hist_items = hist_resp.json()["data"]
    assert len(hist_items) >= 1
    assert hist_items[0]["action_id"] == "opp_created"

    # 5. Update opportunity stage and value
    update_resp = await client.patch(
        f"/api/v1/opportunities/{opp_id}",
        headers=auth_headers,
        json={"stage": "qualified", "value": "150000.00"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["stage"] == "qualified"

    # 6. Verify history records stage_changed and value_updated
    hist_resp2 = await client.get(f"/api/v1/opportunities/{opp_id}/history", headers=auth_headers)
    assert hist_resp2.status_code == 200
    hist_items2 = hist_resp2.json()["data"]
    action_types = [h["action_id"] for h in hist_items2]
    assert "stage_changed" in action_types
    assert "value_updated" in action_types

    # 7. Add a history note
    note_resp = await client.post(
        f"/api/v1/opportunities/{opp_id}/history/notes",
        headers=auth_headers,
        json={"note": "Executive sync with Alice Smith went very well."},
    )
    assert note_resp.status_code == 201
    assert note_resp.json()["action_id"] == "note_added"

    # 8. Create another person and attach to opportunity
    person_resp2 = await client.post(
        "/api/v1/persons",
        headers=auth_headers,
        json={
            "first_name": "Bob",
            "last_name": "Jones",
            "primary_email": "bob.jones@acme.corp",
        },
    )
    assert person_resp2.status_code == 201
    bob_id = person_resp2.json()["id"]

    attach_p_resp = await client.post(
        f"/api/v1/opportunities/{opp_id}/persons",
        headers=auth_headers,
        json={"person_id": bob_id, "role": "champion"},
    )
    assert attach_p_resp.status_code == 200
    assert len(attach_p_resp.json()["persons"]) == 2

    # Detach person
    detach_p_resp = await client.delete(
        f"/api/v1/opportunities/{opp_id}/persons/{bob_id}",
        headers=auth_headers,
    )
    assert detach_p_resp.status_code == 200
    assert len(detach_p_resp.json()["persons"]) == 1

    # 9. Close opportunity as won
    close_resp = await client.post(
        f"/api/v1/opportunities/{opp_id}/close",
        headers=auth_headers,
        json={"outcome": "closed_won", "notes": "Contract signed for 150k USD."},
    )
    assert close_resp.status_code == 200
    assert close_resp.json()["stage"] == "closed_won"
    assert close_resp.json()["probability"] == 100
    assert close_resp.json()["is_stale"] is False
    assert close_resp.json()["is_expired"] is False
    assert close_resp.json()["staleness_status"] == "closed_won"


@pytest.mark.asyncio
async def test_opportunity_staleness_and_expiration(
    client: AsyncClient, auth_headers: dict[str, str]
):
    import datetime

    from cdb.models.opportunity import Opportunity
    from cdb.services.opportunities import compute_opportunity_staleness

    now = datetime.datetime.now(datetime.UTC)

    # 1. Fresh active opportunity (0 days inactive)
    opp_fresh = Opportunity(
        title="Fresh Deal",
        stage="prospect",
        created_at=now,
        updated_at=now,
    )
    status, is_stale, is_expired, days, last_act = compute_opportunity_staleness(opp_fresh)
    assert status == "active"
    assert is_stale is False
    assert is_expired is False
    assert days == 0

    # 2. Stale opportunity (35 days inactive)
    opp_stale = Opportunity(
        title="Stale Deal",
        stage="proposal",
        created_at=now - datetime.timedelta(days=40),
        updated_at=now - datetime.timedelta(days=35),
    )
    status, is_stale, is_expired, days, last_act = compute_opportunity_staleness(opp_stale)
    assert status == "stale"
    assert is_stale is True
    assert is_expired is False
    assert days >= 35

    # 3. Expired opportunity (95 days inactive)
    opp_expired = Opportunity(
        title="Expired Deal",
        stage="negotiation",
        created_at=now - datetime.timedelta(days=100),
        updated_at=now - datetime.timedelta(days=95),
    )
    status, is_stale, is_expired, days, last_act = compute_opportunity_staleness(opp_expired)
    assert status == "expired"
    assert is_stale is False
    assert is_expired is True
    assert days >= 95

    # 4. Closed Won deal should never be stale or expired
    opp_closed = Opportunity(
        title="Won Deal",
        stage="closed_won",
        created_at=now - datetime.timedelta(days=120),
        updated_at=now - datetime.timedelta(days=110),
    )
    status, is_stale, is_expired, days, last_act = compute_opportunity_staleness(opp_closed)
    assert status == "closed_won"
    assert is_stale is False
    assert is_expired is False


@pytest.mark.asyncio
async def test_opportunity_overdue_resolution_date(
    client: AsyncClient, auth_headers: dict[str, str]
):
    import datetime

    past_date = (datetime.date.today() - datetime.timedelta(days=10)).isoformat()
    future_date = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()

    # 1. Create opportunity with past close date
    overdue_resp = await client.post(
        "/api/v1/opportunities",
        headers=auth_headers,
        json={
            "title": "Overdue Deal",
            "stage": "proposal",
            "expected_close_date": past_date,
        },
    )
    assert overdue_resp.status_code == 201
    overdue_data = overdue_resp.json()
    assert overdue_data["is_overdue"] is True
    assert overdue_data["days_overdue"] >= 10

    # 2. Create opportunity with future close date
    future_resp = await client.post(
        "/api/v1/opportunities",
        headers=auth_headers,
        json={
            "title": "Future Deal",
            "stage": "qualified",
            "expected_close_date": future_date,
        },
    )
    assert future_resp.status_code == 201
    future_data = future_resp.json()
    assert future_data["is_overdue"] is False
    assert future_data["days_overdue"] == 0
