import pytest
from httpx import AsyncClient

from cdb.core.security import create_access_token
from cdb.models.user import User


@pytest.fixture
async def auth_headers(db_session) -> dict[str, str]:
    user = User(
        email="testuser@example.com",
        hashed_pw="hashed",
        full_name="Test User",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_person_crud(client: AsyncClient, auth_headers: dict[str, str]):
    # 1. Create person
    resp = await client.post(
        "/api/v1/persons",
        json={
            "first_name": "Alice",
            "last_name": "Smith",
            "primary_email": "alice@acme.com",
            "linkedin_url": "https://www.linkedin.com/in/alice-smith",
            "city": "London",
            "country": "GB",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    person_id = data["id"]
    assert data["first_name"] == "Alice"
    assert data["linkedin_url"] == "linkedin.com/in/alice-smith"

    # 2. List persons
    list_resp = await client.get("/api/v1/persons?q=Alice", headers=auth_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()["data"]) == 1

    # 3. Get person detail
    detail_resp = await client.get(f"/api/v1/persons/{person_id}", headers=auth_headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == person_id

    # 4. Patch person
    patch_resp = await client.patch(
        f"/api/v1/persons/{person_id}",
        json={"city": "Manchester"},
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["city"] == "Manchester"

    # 5. Soft delete
    del_resp = await client.delete(f"/api/v1/persons/{person_id}", headers=auth_headers)
    assert del_resp.status_code == 204

    # Verify not in default list
    list_after_del = await client.get("/api/v1/persons", headers=auth_headers)
    assert len(list_after_del.json()["data"]) == 0


@pytest.mark.asyncio
async def test_person_sorting_pagination_and_bulk_operations(client: AsyncClient, auth_headers: dict[str, str]):
    # Create 3 persons
    p1 = (await client.post("/api/v1/persons", json={"first_name": "Charlie", "last_name": "Brown", "primary_email": "charlie@test.com", "city": "Berlin", "country": "DE"}, headers=auth_headers)).json()
    p2 = (await client.post("/api/v1/persons", json={"first_name": "Alice", "last_name": "Zeta", "primary_email": "alice@test.com", "city": "Paris", "country": "FR"}, headers=auth_headers)).json()
    p3 = (await client.post("/api/v1/persons", json={"first_name": "Bob", "last_name": "Alpha", "primary_email": "bob@test.com", "city": "London", "country": "GB"}, headers=auth_headers)).json()

    # 1. Test sorting by first_name asc
    res_sort_asc = await client.get("/api/v1/persons?sort=first_name&order=asc", headers=auth_headers)
    assert res_sort_asc.status_code == 200
    names_asc = [p["first_name"] for p in res_sort_asc.json()["data"]]
    assert names_asc == ["Alice", "Bob", "Charlie"]

    # 2. Test sorting by first_name desc
    res_sort_desc = await client.get("/api/v1/persons?sort=first_name&order=desc", headers=auth_headers)
    names_desc = [p["first_name"] for p in res_sort_desc.json()["data"]]
    assert names_desc == ["Charlie", "Bob", "Alice"]

    # 3. Test timestamps in summary response
    first_summary = res_sort_asc.json()["data"][0]
    assert "created_at" in first_summary and first_summary["created_at"] is not None
    assert "updated_at" in first_summary and first_summary["updated_at"] is not None
    assert first_summary["city"] == "Paris"
    assert first_summary["country"] == "FR"

    # 4. Test pagination
    p_page1 = await client.get("/api/v1/persons?sort=first_name&order=asc&page=1&page_size=2", headers=auth_headers)
    assert len(p_page1.json()["data"]) == 2
    assert p_page1.json()["data"][0]["first_name"] == "Alice"
    assert p_page1.json()["data"][1]["first_name"] == "Bob"
    assert p_page1.json()["pagination"]["total"] == 3

    p_page2 = await client.get("/api/v1/persons?sort=first_name&order=asc&page=2&page_size=2", headers=auth_headers)
    assert len(p_page2.json()["data"]) == 1
    assert p_page2.json()["data"][0]["first_name"] == "Charlie"

    # 5. Test Bulk Update
    bulk_up_resp = await client.post(
        "/api/v1/persons/bulk-update",
        json={
            "person_ids": [p1["id"], p2["id"]],
            "city": "Amsterdam",
            "country": "NL",
            "add_sources": ["bulk_cleaned", "crm_import"],
        },
        headers=auth_headers,
    )
    assert bulk_up_resp.status_code == 200
    assert bulk_up_resp.json()["updated_count"] == 2

    # Verify updated
    chk1 = (await client.get(f"/api/v1/persons/{p1['id']}", headers=auth_headers)).json()
    assert chk1["city"] == "Amsterdam"
    assert chk1["country"] == "NL"
    assert "bulk_cleaned" in chk1["sources"]
    assert "crm_import" in chk1["sources"]

    # 6. Test Bulk Delete
    bulk_del_resp = await client.post(
        "/api/v1/persons/bulk-delete",
        json={"person_ids": [p1["id"], p2["id"]]},
        headers=auth_headers,
    )
    assert bulk_del_resp.status_code == 200
    assert bulk_del_resp.json()["updated_count"] == 2

    # Verify remaining
    rem_resp = await client.get("/api/v1/persons", headers=auth_headers)
    assert len(rem_resp.json()["data"]) == 1
    assert rem_resp.json()["data"][0]["id"] == p3["id"]


@pytest.mark.asyncio
async def test_company_and_relationship_crud(client: AsyncClient, auth_headers: dict[str, str]):
    # Create company
    c_resp = await client.post(
        "/api/v1/companies",
        json={"name": "Acme Corp", "domain": "acme.com", "industry": "Software", "country": "GB"},
        headers=auth_headers,
    )
    assert c_resp.status_code == 201
    comp_id = c_resp.json()["id"]

    # Create person
    p_resp = await client.post(
        "/api/v1/persons",
        json={"first_name": "Bob", "last_name": "Jones", "primary_email": "bob@acme.com"},
        headers=auth_headers,
    )
    person_id = p_resp.json()["id"]

    # Link person to company
    rel_resp = await client.post(
        f"/api/v1/companies/persons/{person_id}/companies",
        json={"company_id": comp_id, "title": "VP Engineering", "is_current": True},
        headers=auth_headers,
    )
    assert rel_resp.status_code == 201
    assert rel_resp.json()["title"] == "VP Engineering"

    # Verify person detail shows career
    p_detail = await client.get(f"/api/v1/persons/{person_id}", headers=auth_headers)
    assert len(p_detail.json()["career"]) == 1
    assert p_detail.json()["career"][0]["company"]["name"] == "Acme Corp"


@pytest.mark.asyncio
async def test_activity_crud(client: AsyncClient, auth_headers: dict[str, str]):
    p_resp = await client.post(
        "/api/v1/persons",
        json={"first_name": "Charlie", "last_name": "Brown", "primary_email": "charlie@test.com"},
        headers=auth_headers,
    )
    person_id = p_resp.json()["id"]

    act_resp = await client.post(
        "/api/v1/activities",
        json={
            "person_id": person_id,
            "type": "call",
            "source": "manual",
            "title": "Introductory Call",
            "summary": "Discussed roadmap",
        },
        headers=auth_headers,
    )
    assert act_resp.status_code == 201
    act_id = act_resp.json()["id"]
    assert act_id is not None

    # List activities
    list_acts = await client.get(f"/api/v1/activities?person_id={person_id}", headers=auth_headers)
    assert list_acts.status_code == 200
    assert len(list_acts.json()["data"]) == 1


@pytest.mark.asyncio
async def test_lead_lifecycle_and_conversion(client: AsyncClient, auth_headers: dict[str, str]):
    p_resp = await client.post(
        "/api/v1/persons",
        json={"first_name": "Dave", "last_name": "Miller", "primary_email": "dave@test.com"},
        headers=auth_headers,
    )
    person_id = p_resp.json()["id"]

    # 1. Create lead
    l_resp = await client.post(
        "/api/v1/leads",
        json={"person_id": person_id, "source": "linkedin_message", "intent": "consulting"},
        headers=auth_headers,
    )
    assert l_resp.status_code == 201
    lead_id = l_resp.json()["id"]
    assert l_resp.json()["stage"] == "new"

    # 2. Advance lead
    adv_resp = await client.post(f"/api/v1/leads/{lead_id}/advance", json={"notes": "Called client"}, headers=auth_headers)
    assert adv_resp.status_code == 200
    assert adv_resp.json()["stage"] == "contacted"

    # Advance to qualified
    adv_resp2 = await client.post(f"/api/v1/leads/{lead_id}/advance", json={}, headers=auth_headers)
    assert adv_resp2.status_code == 200
    assert adv_resp2.json()["stage"] == "qualified"

    # 3. Convert lead to opportunity
    conv_resp = await client.post(
        f"/api/v1/leads/{lead_id}/convert",
        json={"title": "Dave Consulting Project", "value": 5000},
        headers=auth_headers,
    )
    assert conv_resp.status_code == 201
    opp_data = conv_resp.json()
    assert opp_data["title"] == "Dave Consulting Project"
    assert opp_data["source_lead_id"] == lead_id

    # Verify lead status is converted
    lead_check = await client.get(f"/api/v1/leads/{lead_id}", headers=auth_headers)
    assert lead_check.json()["stage"] == "converted"
    assert lead_check.json()["converted_opportunity_id"] == opp_data["id"]


@pytest.mark.asyncio
async def test_ingestion_and_er_queue(client: AsyncClient, auth_headers: dict[str, str]):
    # Ingest LinkedIn Connection
    api_key_header = {"X-API-Key": "development-api-key"}
    ingest_resp = await client.post(
        "/api/v1/ingest/linkedin-connections",
        json={
            "records": [
                {
                    "connection_id": "li_conn_001",
                    "first_name": "Eva",
                    "last_name": "Green",
                    "profile_url": "https://www.linkedin.com/in/evagreen",
                    "email_address": "eva@green.com",
                    "company": "Green Tech",
                    "position": "Director",
                }
            ]
        },
        headers=api_key_header,
    )
    assert ingest_resp.status_code == 202
    assert ingest_resp.json()["queued"] == 1

    # Verify person created via ingestion
    persons_resp = await client.get("/api/v1/persons?q=Eva", headers=auth_headers)
    assert len(persons_resp.json()["data"]) == 1
    eva_id = persons_resp.json()["data"][0]["id"]
    assert eva_id is not None
    assert persons_resp.json()["data"][0]["primary_email"] == "eva@green.com"

    # Create another person to form a candidate pair
    await client.post(
        "/api/v1/persons",
        json={"first_name": "Eva", "last_name": "Greene", "primary_email": "eva.greene@other.com"},
        headers=auth_headers,
    )

    # Run ER scan
    run_resp = await client.post("/api/v1/er/run", headers=auth_headers)
    assert run_resp.status_code == 202

    # Check ER Queue
    queue_resp = await client.get("/api/v1/er/queue", headers=auth_headers)
    assert queue_resp.status_code == 200
    queue_data = queue_resp.json()["data"]
    assert len(queue_data) >= 1
    candidate_id = queue_data[0]["id"]

    # Test rejecting candidate pair (Keep Separate)
    reject_resp = await client.post(f"/api/v1/er/queue/{candidate_id}/reject", headers=auth_headers)
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "rejected"

    # Create pair to test merging (accept) via review queue
    await client.post(
        "/api/v1/persons",
        json={"first_name": "Frank", "last_name": "Castille", "primary_email": "fcastle@alpha.com"},
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/persons",
        json={"first_name": "Frank", "last_name": "Castille", "primary_email": "frank.c@beta.com"},
        headers=auth_headers,
    )
    await client.post("/api/v1/er/run", headers=auth_headers)
    q2 = await client.get("/api/v1/er/queue", headers=auth_headers)
    assert len(q2.json()["data"]) >= 1
    c2_id = q2.json()["data"][0]["id"]

    # Test accepting / confirming merge
    accept_resp = await client.post(f"/api/v1/er/queue/{c2_id}/accept", headers=auth_headers)
    assert accept_resp.status_code == 200
    assert "master_person_id" in accept_resp.json()

    # Test merging with unique linkedin_url transfer (Faizan Khan scenario)
    await client.post(
        "/api/v1/persons",
        json={"first_name": "Faizan", "last_name": "Khan", "primary_email": "faizan.sub@substack.com"},
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/persons",
        json={"first_name": "Faizan", "last_name": "Khan", "linkedin_url": "https://linkedin.com/in/ifaizankhan"},
        headers=auth_headers,
    )
    await client.post("/api/v1/er/run", headers=auth_headers)
    q3 = await client.get("/api/v1/er/queue", headers=auth_headers)
    assert len(q3.json()["data"]) >= 1
    c3_id = q3.json()["data"][0]["id"]

    # Confirm & Merge
    merge_resp = await client.post(f"/api/v1/er/queue/{c3_id}/accept", headers=auth_headers)
    assert merge_resp.status_code == 200
    master_pid = merge_resp.json()["master_person_id"]

    # Verify master record has the merged linkedin_url
    master_person = await client.get(f"/api/v1/persons/{master_pid}", headers=auth_headers)
    assert master_person.status_code == 200
    assert master_person.json()["linkedin_url"] == "linkedin.com/in/ifaizankhan"




