import pytest
from httpx import AsyncClient

from cdb.core.security import create_access_token
from cdb.models.user import User


@pytest.fixture
async def auth_headers(db_session) -> dict[str, str]:
    user = User(
        email="auditor@example.com",
        hashed_pw="hashed",
        full_name="Audit Tester",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_person_actions_and_history(client: AsyncClient, auth_headers: dict[str, str]):
    # 1. Test list actions dimension
    actions_resp = await client.get("/api/v1/persons/actions", headers=auth_headers)
    assert actions_resp.status_code == 200
    actions_data = actions_resp.json()
    assert len(actions_data) >= 10
    action_ids = [a["id"] for a in actions_data]
    assert "record_created" in action_ids
    assert "profile_updated" in action_ids
    assert "segment_changed" in action_ids
    assert "company_linked" in action_ids

    # 2. Create a person
    person_resp = await client.post(
        "/api/v1/persons",
        headers=auth_headers,
        json={
            "first_name": "Audited",
            "last_name": "Person",
            "primary_email": "audited.person@example.com",
            "city": "Berlin",
            "country": "DE",
        },
    )
    assert person_resp.status_code == 201
    person_id = person_resp.json()["id"]

    # 3. Check initial history contains record_created
    history_resp = await client.get(f"/api/v1/persons/{person_id}/history", headers=auth_headers)
    assert history_resp.status_code == 200
    hist_data = history_resp.json()["data"]
    assert len(hist_data) == 1
    assert hist_data[0]["action_id"] == "record_created"
    assert hist_data[0]["action"]["name"] == "Record Created"
    assert "created_at" in hist_data[0]
    assert "updated_at" in hist_data[0]

    # 4. Update person fields
    update_resp = await client.patch(
        f"/api/v1/persons/{person_id}",
        headers=auth_headers,
        json={"city": "Munich", "primary_phone": "+49 89 123456"},
    )
    assert update_resp.status_code == 200

    # 5. Verify history records profile_updated with field diffs
    history_resp2 = await client.get(f"/api/v1/persons/{person_id}/history", headers=auth_headers)
    hist_data2 = history_resp2.json()["data"]
    assert len(hist_data2) == 2
    update_event = next(h for h in hist_data2 if h["action_id"] == "profile_updated")
    assert "city" in update_event["changes"]
    assert update_event["changes"]["city"]["old"] == "Berlin"
    assert update_event["changes"]["city"]["new"] == "Munich"

    # 6. Create company and link to person
    comp_resp = await client.post(
        "/api/v1/companies",
        headers=auth_headers,
        json={"name": "Audit Corp", "domain": "auditcorp.com"},
    )
    assert comp_resp.status_code == 201
    comp_id = comp_resp.json()["id"]

    link_resp = await client.post(
        f"/api/v1/companies/persons/{person_id}/companies",
        headers=auth_headers,
        json={"company_id": comp_id, "title": "Director of Compliance", "is_current": True},
    )
    assert link_resp.status_code == 201

    # 7. Verify history records company_linked
    history_resp3 = await client.get(f"/api/v1/persons/{person_id}/history", headers=auth_headers)
    hist_data3 = history_resp3.json()["data"]
    assert len(hist_data3) == 3
    link_event = next(h for h in hist_data3 if h["action_id"] == "company_linked")
    assert link_event["changes"]["company_name"] == "Audit Corp"
    assert link_event["changes"]["title"] == "Director of Compliance"
