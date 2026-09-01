import pytest
from httpx import AsyncClient

from cdb.core.security import create_access_token
from cdb.models.user import User


@pytest.fixture
async def auth_headers(db_session) -> dict[str, str]:
    user = User(
        email="eng_testuser@example.com",
        hashed_pw="hashed",
        full_name="Engagement Lead",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_engagement_lifecycle(client: AsyncClient, auth_headers: dict[str, str]):
    # 1. Create client company
    comp_res = await client.post(
        "/api/v1/companies",
        json={"name": "Synthetix Dynamics Corp", "domain": "synthetix.io", "industry": "AI & Tech"},
        headers=auth_headers,
    )
    assert comp_res.status_code == 201
    company_id = comp_res.json()["id"]

    # 2. Create contact person
    person_res = await client.post(
        "/api/v1/persons",
        json={
            "first_name": "Elena",
            "last_name": "Rostova",
            "primary_email": "elena@synthetix.io",
        },
        headers=auth_headers,
    )
    assert person_res.status_code == 201
    person_id = person_res.json()["id"]

    # 3. Create second contact person
    person2_res = await client.post(
        "/api/v1/persons",
        json={
            "first_name": "Marcus",
            "last_name": "Vance",
            "primary_email": "marcus@synthetix.io",
        },
        headers=auth_headers,
    )
    assert person2_res.status_code == 201
    person2_id = person2_res.json()["id"]

    # 4. Create engagement with initial person, rate, and contract terms
    eng_payload = {
        "title": "Enterprise Data Platform & ML Ops Delivery",
        "company_id": company_id,
        "status": "active",
        "engagement_type": "consultancy",
        "rate_type": "daily",
        "rate_value": "1650.00",
        "currency": "USD",
        "total_value": "82500.00",
        "contract_ref": "MSA-SYN-2026-088",
        "contract_status": "signed",
        "signed_at": "2026-08-15",
        "terms_and_conditions": "Net 30 days payment. 40 hours/week cap. IP assigned upon payment.",
        "start_date": "2026-08-20",
        "expected_end_date": "2026-11-30",
        "notes": "Weekly sprint demos on Thursdays",
        "person_ids": [{"person_id": person_id, "role": "client_lead"}],
    }
    create_res = await client.post("/api/v1/engagements", json=eng_payload, headers=auth_headers)
    assert create_res.status_code == 201
    eng_data = create_res.json()
    eng_id = eng_data["id"]
    assert eng_data["title"] == "Enterprise Data Platform & ML Ops Delivery"
    assert eng_data["company"]["name"] == "Synthetix Dynamics Corp"
    assert len(eng_data["persons"]) == 1
    assert eng_data["persons"][0]["person_name"] == "Elena Rostova"
    assert eng_data["persons"][0]["role"] == "client_lead"
    assert eng_data["rate_type"] == "daily"
    assert float(eng_data["rate_value"]) == 1650.0
    assert eng_data["contract_ref"] == "MSA-SYN-2026-088"
    assert "Net 30" in eng_data["terms_and_conditions"]

    # 5. Get single engagement
    get_res = await client.get(f"/api/v1/engagements/{eng_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == eng_id

    # 6. List engagements with filters
    list_res = await client.get(
        f"/api/v1/engagements?status=active&company_id={company_id}",
        headers=auth_headers,
    )
    assert list_res.status_code == 200
    assert len(list_res.json()["data"]) == 1

    # Search filter
    search_res = await client.get(
        "/api/v1/engagements?search=ML Ops",
        headers=auth_headers,
    )
    assert search_res.status_code == 200
    assert len(search_res.json()["data"]) == 1

    # 7. Attach second person
    attach_res = await client.post(
        f"/api/v1/engagements/{eng_id}/persons",
        json={"person_id": person2_id, "role": "technical_sponsor"},
        headers=auth_headers,
    )
    assert attach_res.status_code == 200
    assert len(attach_res.json()["persons"]) == 2

    # 8. Log activity / Notion meeting note directly to engagement
    act_payload = {
        "title": "Architecture Deep-Dive & SOW Alignment",
        "type": "meeting",
        "source": "notion",
        "summary": "Reviewed ingestion pipeline requirements and agreed on milestone 1 delivery date.",
        "occurred_at": "2026-08-25T10:00:00Z",
    }
    act_res = await client.post(
        f"/api/v1/engagements/{eng_id}/activities",
        json=act_payload,
        headers=auth_headers,
    )
    assert act_res.status_code == 201
    assert act_res.json()["engagement_id"] == eng_id

    # Query engagement activities
    eng_acts_res = await client.get(
        f"/api/v1/engagements/{eng_id}/activities",
        headers=auth_headers,
    )
    assert eng_acts_res.status_code == 200
    assert len(eng_acts_res.json()) >= 1
    assert eng_acts_res.json()[0]["title"] == "Architecture Deep-Dive & SOW Alignment"

    # AI Summary fetch & refresh
    ai_sum_res = await client.get(
        f"/api/v1/engagements/{eng_id}/ai-summary",
        headers=auth_headers,
    )
    assert ai_sum_res.status_code == 200
    ai_data = ai_sum_res.json()
    assert "executive_summary" in ai_data
    assert "client_sentiment" in ai_data
    assert len(ai_data["key_highlights"]) >= 1
    assert len(ai_data["action_items"]) >= 1

    refresh_ai_res = await client.post(
        f"/api/v1/engagements/{eng_id}/ai-summary/refresh",
        headers=auth_headers,
    )
    assert refresh_ai_res.status_code == 200
    assert refresh_ai_res.json()["activity_count_analyzed"] >= 1

    # 9. Update engagement fields
    update_res = await client.patch(
        f"/api/v1/engagements/{eng_id}",
        json={
            "total_value": "95000.00",
            "status": "in_delivery",
            "notes": "Scope extended to include Lakehouse setup",
        },
        headers=auth_headers,
    )
    assert update_res.status_code == 200
    assert float(update_res.json()["total_value"]) == 95000.0
    assert update_res.json()["status"] == "in_delivery"

    # 10. Detach person
    detach_res = await client.delete(
        f"/api/v1/engagements/{eng_id}/persons/{person2_id}",
        headers=auth_headers,
    )
    assert detach_res.status_code == 200
    assert len(detach_res.json()["persons"]) == 1

    # 11. Delete engagement
    del_res = await client.delete(f"/api/v1/engagements/{eng_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # Confirm 404 after delete
    check_res = await client.get(f"/api/v1/engagements/{eng_id}", headers=auth_headers)
    assert check_res.status_code == 404
