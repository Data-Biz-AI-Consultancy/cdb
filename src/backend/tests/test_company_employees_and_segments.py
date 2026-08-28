import pytest
from httpx import AsyncClient

from cdb.core.security import create_access_token
from cdb.models.user import User


@pytest.fixture
async def auth_headers(db_session) -> dict[str, str]:
    user = User(
        email="segment_tester@example.com",
        hashed_pw="hashed",
        full_name="Segment Tester",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_company_employees_current_and_alumni(
    client: AsyncClient, auth_headers: dict[str, str]
):
    # 1. Create company
    c_resp = await client.post(
        "/api/v1/companies",
        json={"name": "Tech Corp", "domain": "techcorp.io", "industry": "Software"},
        headers=auth_headers,
    )
    assert c_resp.status_code == 201
    comp_id = c_resp.json()["id"]

    # 2. Create two persons
    p1_resp = await client.post(
        "/api/v1/persons",
        json={"first_name": "Bob", "last_name": "Engineer", "primary_email": "bob@techcorp.io"},
        headers=auth_headers,
    )
    assert p1_resp.status_code == 201
    p1_id = p1_resp.json()["id"]

    p2_resp = await client.post(
        "/api/v1/persons",
        json={"first_name": "Charlie", "last_name": "Alumni", "primary_email": "charlie@other.com"},
        headers=auth_headers,
    )
    assert p2_resp.status_code == 201
    p2_id = p2_resp.json()["id"]

    # 3. Add relationships (Bob is current, Charlie is former)
    await client.post(
        f"/api/v1/companies/persons/{p1_id}/companies",
        json={"company_id": comp_id, "title": "Staff Engineer", "is_current": True},
        headers=auth_headers,
    )
    await client.post(
        f"/api/v1/companies/persons/{p2_id}/companies",
        json={"company_id": comp_id, "title": "Former CTO", "is_current": False},
        headers=auth_headers,
    )

    # 4. List all employees
    all_emp_resp = await client.get(f"/api/v1/companies/{comp_id}/employees", headers=auth_headers)
    assert all_emp_resp.status_code == 200
    all_emps = all_emp_resp.json()
    assert len(all_emps) == 2

    # 5. List current only
    curr_emp_resp = await client.get(
        f"/api/v1/companies/{comp_id}/employees?current_only=true", headers=auth_headers
    )
    assert curr_emp_resp.status_code == 200
    curr_emps = curr_emp_resp.json()
    assert len(curr_emps) == 1
    assert curr_emps[0]["person_id"] == p1_id
    assert curr_emps[0]["title"] == "Staff Engineer"


@pytest.mark.asyncio
async def test_evaluate_segments_and_temperature_api(
    client: AsyncClient, auth_headers: dict[str, str]
):
    # 1. Create a person with recruiter title
    p_resp = await client.post(
        "/api/v1/persons",
        json={
            "first_name": "Sarah",
            "last_name": "Talent",
            "primary_email": "sarah.recruiter@agency.com",
            "country": "DE",
            "city": "Berlin",
        },
        headers=auth_headers,
    )
    p_id = p_resp.json()["id"]

    # Create company and relationship with recruiter title
    c_resp = await client.post(
        "/api/v1/companies",
        json={"name": "Hiring Agency", "domain": "agency.com"},
        headers=auth_headers,
    )
    comp_id = c_resp.json()["id"]

    await client.post(
        f"/api/v1/companies/persons/{p_id}/companies",
        json={
            "company_id": comp_id,
            "title": "Senior Talent Acquisition Manager",
            "is_current": True,
        },
        headers=auth_headers,
    )

    # 2. Trigger evaluate segments
    seg_resp = await client.post("/api/v1/segments/evaluate", headers=auth_headers)
    assert seg_resp.status_code == 200
    res_data = seg_resp.json()
    assert res_data["status"] == "success"
    assert "person_segments" in res_data
    assert res_data["person_segments"]["recruiters_and_talent"] >= 1
    assert "engagement_temperatures" in res_data

    # 3. Check updated person attributes
    person_detail = await client.get(f"/api/v1/persons/{p_id}", headers=auth_headers)
    attrs = person_detail.json()["attributes"]
    assert attrs["segment"] == "recruiters_and_talent"
    assert "segment:recruiters_and_talent" in attrs["tags"]
    assert "geo:de" in attrs["tags"]


@pytest.mark.asyncio
async def test_backfill_linkedin_connections_without_resolved_person(
    client: AsyncClient, auth_headers: dict[str, str], db_session
):
    from cdb.models.intake import IntakeLinkedInConnection
    from cdb.services.ingestion.backfill import backfill_linkedin_companies_and_relationships

    # 1. Insert unlinked intake connections
    conn1 = IntakeLinkedInConnection(
        connection_id="li-conn-001",
        first_name="Diana",
        last_name="Prince",
        profile_url="https://www.linkedin.com/in/dianaprince",
        email_address="diana@themyscira.io",
        company="Themyscira AI Labs GmbH",
        position="Chief AI Officer",
        status="pending",
        resolved_person_id=None,
    )
    conn2 = IntakeLinkedInConnection(
        connection_id="li-conn-002",
        first_name="Bruce",
        last_name="Wayne",
        profile_url="https://www.linkedin.com/in/brucewayne",
        email_address="bruce@wayneenterprises.com",
        company="Wayne Enterprises",
        position="Chairman",
        status="pending",
        resolved_person_id=None,
    )
    db_session.add_all([conn1, conn2])
    await db_session.commit()

    # 2. Run backfill
    res = await backfill_linkedin_companies_and_relationships(db_session)
    assert res["status"] == "success"
    assert res["processed_connections"] >= 2
    assert res["created_persons"] >= 2
    assert res["created_companies"] >= 2
    assert res["created_relationships"] >= 2

    # 3. Verify in API
    comp_list = await client.get("/api/v1/companies?q=Wayne", headers=auth_headers)
    assert comp_list.status_code == 200
    comp_data = comp_list.json()["data"]
    assert len(comp_data) >= 1
    wayne_co = comp_data[0]
    assert wayne_co["contacts_count"] >= 1
