from decimal import Decimal
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.security import create_access_token
from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.opportunity import Opportunity, OpportunityCompany
from cdb.models.person import Person
from cdb.models.signal import DetectedSignal
from cdb.models.user import User
from cdb.services.signals.catalog import ensure_signals_dimension
from cdb.services.signals.routing import (
    evaluate_signal_escalation,
    resolve_signal_owner,
)


@pytest.fixture
async def setup_users(db_session: AsyncSession) -> dict[str, Any]:
    admin = User(
        email="lead_admin@example.com",
        hashed_pw="hashed_pw",
        full_name="Lead Admin",
        role="admin",
        is_active=True,
    )
    member = User(
        email="deal_owner@example.com",
        hashed_pw="hashed_pw",
        full_name="Deal Owner",
        role="member",
        is_active=True,
    )
    eng_lead = User(
        email="eng_lead@example.com",
        hashed_pw="hashed_pw",
        full_name="Engagement Lead",
        role="member",
        is_active=True,
    )
    db_session.add_all([admin, member, eng_lead])
    await db_session.commit()
    await db_session.refresh(admin)
    await db_session.refresh(member)
    await db_session.refresh(eng_lead)

    token = create_access_token(admin.id, admin.role)
    return {
        "admin": admin,
        "member": member,
        "eng_lead": eng_lead,
        "headers": {"Authorization": f"Bearer {token}"},
    }


@pytest.mark.asyncio
async def test_ownership_resolution_hierarchy(db_session: AsyncSession, setup_users: dict):
    users = setup_users
    eng_lead = users["eng_lead"]
    deal_owner = users["member"]

    company = Company(name="Acme Corporation", domain="acmecorp.com")
    db_session.add(company)
    await db_session.flush()

    # 1. Company with active engagement owner
    eng = Engagement(
        title="AI Transformation Project",
        company_id=company.id,
        owner_id=eng_lead.id,
        status="active",
        contract_status="signed",
    )
    db_session.add(eng)
    await db_session.flush()

    resolved = await resolve_signal_owner(db_session, company_id=company.id, engagement_id=eng.id)
    assert resolved == eng_lead.id

    # 2. Company level lookup finds active engagement owner
    resolved_by_company = await resolve_signal_owner(db_session, company_id=company.id)
    assert resolved_by_company == eng_lead.id

    # 3. Opportunity with direct owner
    opp = Opportunity(
        title="Data Warehouse Expansion",
        owner_id=deal_owner.id,
        stage="qualified",
    )
    db_session.add(opp)
    await db_session.flush()

    opp_company = OpportunityCompany(opportunity_id=opp.id, company_id=company.id, role="client")
    db_session.add(opp_company)
    await db_session.flush()

    resolved_opp = await resolve_signal_owner(
        db_session, company_id=company.id, opportunity_id=opp.id
    )
    assert resolved_opp == deal_owner.id

    # 4. Fallback for unlinked entity
    unlinked_company = Company(name="New Prospect Inc", domain="newprospect.com")
    db_session.add(unlinked_company)
    await db_session.flush()

    unassigned_res = await resolve_signal_owner(db_session, company_id=unlinked_company.id)
    assert unassigned_res is None


@pytest.mark.asyncio
async def test_evaluate_signal_escalation():
    # Case 1: P0 composite priority score >= 90
    is_esc, level, reason = evaluate_signal_escalation(
        severity="high",
        priority_tier="P0",
        score=92.5,
    )
    assert is_esc is True
    assert level == "critical"
    assert "P0 critical" in reason

    # Case 2: SLA breach on critical unanswered conversation (>= 7 days)
    is_esc, level, reason = evaluate_signal_escalation(
        severity="critical",
        priority_tier="P1",
        score=85.0,
        key_metrics={"days_unanswered": 8},
    )
    assert is_esc is True
    assert level == "critical"
    assert "SLA breach" in reason

    # Case 3: Standard medium signal (no escalation)
    is_esc, level, reason = evaluate_signal_escalation(
        severity="medium",
        priority_tier="P2",
        score=60.0,
        key_metrics={"days_elapsed": 10},
    )
    assert is_esc is False
    assert level == "none"
    assert reason is None


@pytest.mark.asyncio
async def test_assign_and_escalate_endpoints(
    client: AsyncClient, db_session: AsyncSession, setup_users: dict
):
    await ensure_signals_dimension(db_session)
    users = setup_users
    admin = users["admin"]
    member = users["member"]
    headers = users["headers"]

    company = Company(name="Stripe Partner", domain="stripepartner.com")
    db_session.add(company)
    await db_session.flush()

    sig = DetectedSignal(
        signal_id="hiring_funding_event",
        company_id=company.id,
        status="active",
        severity="high",
        score=Decimal("80.0"),
        title="Stripe Partner Series B Announcement",
        summary="Raised 25M Series B with aggressive AI hiring.",
        metadata_payload={
            "priority_tier": "P1",
            "evidence": {
                "why_it_matters_now": "Urgent capacity bottlenecks during rapid hiring phase.",
                "excerpt": "Looking for senior data engineering advisory team.",
            },
        },
    )
    db_session.add(sig)
    await db_session.commit()
    await db_session.refresh(sig)

    # 1. Assign signal owner via API
    assign_resp = await client.post(
        f"/api/v1/signals/detected/{sig.id}/assign",
        json={"owner_id": str(member.id)},
        headers=headers,
    )
    assert assign_resp.status_code == 200
    assign_data = assign_resp.json()
    assert assign_data["owner_id"] == str(member.id)
    assert assign_data["owner_name"] == "Deal Owner"
    assert assign_data["assigned_by_name"] == "Lead Admin"

    # 2. Escalate signal via API
    escalate_resp = await client.post(
        f"/api/v1/signals/detected/{sig.id}/escalate",
        json={
            "escalated_to_id": str(admin.id),
            "escalation_level": "critical",
            "escalation_reason": "High-value enterprise deal requiring partner sign-off.",
        },
        headers=headers,
    )
    assert escalate_resp.status_code == 200
    esc_data = escalate_resp.json()
    assert esc_data["is_escalated"] is True
    assert esc_data["escalation_level"] == "critical"
    assert esc_data["escalated_to_id"] == str(admin.id)
    assert esc_data["escalation_reason"] == "High-value enterprise deal requiring partner sign-off."

    # 3. De-escalate signal via API
    deesc_resp = await client.post(
        f"/api/v1/signals/detected/{sig.id}/de-escalate",
        json={"resolution_notes": "Reviewed and aligned with delivery lead."},
        headers=headers,
    )
    assert deesc_resp.status_code == 200
    deesc_data = deesc_resp.json()
    assert deesc_data["is_escalated"] is False
    assert deesc_data["escalation_level"] == "none"
    assert "[De-escalated]" in deesc_data["resolution_notes"]

    # 4. Unassign owner (pass null)
    unassign_resp = await client.post(
        f"/api/v1/signals/detected/{sig.id}/assign",
        json={"owner_id": None},
        headers=headers,
    )
    assert unassign_resp.status_code == 200
    assert unassign_resp.json()["owner_id"] is None


@pytest.mark.asyncio
async def test_convert_signal_to_opportunity_workflow(
    client: AsyncClient, db_session: AsyncSession, setup_users: dict
):
    await ensure_signals_dimension(db_session)
    users = setup_users
    member = users["member"]
    headers = users["headers"]

    company = Company(name="Snowflake Advisory Corp", domain="snowcorp.com")
    person = Person(first_name="Jane", last_name="Doe", primary_email="jane@snowcorp.com")
    db_session.add_all([company, person])
    await db_session.flush()

    sig = DetectedSignal(
        signal_id="hiring_funding_event",
        company_id=company.id,
        person_id=person.id,
        status="active",
        severity="high",
        score=Decimal("85.0"),
        title="Snowflake Advisory Hiring Expansion",
        summary="Expanding data engineering team by 20 heads.",
        metadata_payload={
            "priority_tier": "P1",
            "evidence": {
                "why_it_matters_now": "Rapid expansion creates immediate consulting team demand.",
                "excerpt": "Hiring 5 data platform leads in Q4.",
            },
        },
    )
    db_session.add(sig)
    await db_session.commit()
    await db_session.refresh(sig)

    # Convert Signal to Opportunity
    opp_payload = {
        "title": "Snowflake Advisory Data Platform Architecture",
        "value": 75000.00,
        "currency": "EUR",
        "stage": "qualified",
        "probability": 70,
        "notes": "Target initial 3-month roadmap sprint.",
        "owner_id": str(member.id),
    }

    route_resp = await client.post(
        f"/api/v1/signals/detected/{sig.id}/create-opportunity",
        json=opp_payload,
        headers=headers,
    )
    assert route_resp.status_code == 201
    res_data = route_resp.json()
    assert res_data["success"] is True
    assert res_data["workflow_type"] == "opportunity"
    assert res_data["routed_entity_id"] is not None

    sig_res = res_data["signal"]
    assert sig_res["status"] == "actioned"
    assert sig_res["routed_opportunity_id"] == res_data["routed_entity_id"]
    assert sig_res["routed_workflow_type"] == "opportunity"

    # Verify created Opportunity details in CRM
    opp_id = res_data["routed_entity_id"]
    opp_fetch_resp = await client.get(f"/api/v1/opportunities/{opp_id}", headers=headers)
    assert opp_fetch_resp.status_code == 200
    opp_data = opp_fetch_resp.json()
    assert opp_data["title"] == "Snowflake Advisory Data Platform Architecture"
    assert float(opp_data["value"]) == 75000.00
    assert opp_data["stage"] == "qualified"
    assert opp_data["probability"] == 70
    assert opp_data["owner_id"] == str(member.id)
    # Check context retention in notes
    assert "Originating Signal Context" in opp_data["notes"]
    assert "Snowflake Advisory Hiring Expansion" in opp_data["notes"]
    assert "Target initial 3-month roadmap sprint." in opp_data["notes"]
    # Check attached company and person
    assert len(opp_data["companies"]) == 1
    assert opp_data["companies"][0]["company_id"] == str(company.id)
    assert len(opp_data["persons"]) == 1
    assert opp_data["persons"][0]["person_id"] == str(person.id)
    # Check attributes backlink
    assert opp_data["attributes"]["source_signal_id"] == str(sig.id)
    assert opp_data["attributes"]["source_signal_slug"] == "hiring_funding_event"


@pytest.mark.asyncio
async def test_route_generic_workflow(
    client: AsyncClient, db_session: AsyncSession, setup_users: dict
):
    await ensure_signals_dimension(db_session)
    users = setup_users
    headers = users["headers"]

    company = Company(name="FinTech Solutions", domain="fintechsol.com")
    db_session.add(company)
    await db_session.flush()

    eng = Engagement(
        title="Core Retainer Advisory",
        company_id=company.id,
        status="active",
        contract_status="signed",
    )
    db_session.add(eng)
    await db_session.flush()

    sig = DetectedSignal(
        signal_id="expiring_contract",
        company_id=company.id,
        engagement_id=eng.id,
        status="active",
        severity="high",
        score=Decimal("82.0"),
        title="Expiring Contract: Core Retainer Advisory",
        summary="Contract expires in 30 days.",
    )
    db_session.add(sig)
    await db_session.commit()
    await db_session.refresh(sig)

    route_resp = await client.post(
        f"/api/v1/signals/detected/{sig.id}/route-workflow",
        json={
            "workflow_type": "engagement_renewal",
            "notes": "Triggered 6-month extension SOW preparation.",
        },
        headers=headers,
    )
    assert route_resp.status_code == 200
    res_data = route_resp.json()
    assert res_data["success"] is True
    assert res_data["workflow_type"] == "engagement_renewal"
    assert res_data["routed_entity_id"] == str(eng.id)
    assert res_data["signal"]["status"] == "actioned"
    assert res_data["signal"]["routed_workflow_type"] == "engagement_renewal"


@pytest.mark.asyncio
async def test_signal_filters_and_stats(
    client: AsyncClient, db_session: AsyncSession, setup_users: dict
):
    await ensure_signals_dimension(db_session)
    users = setup_users
    member = users["member"]
    headers = users["headers"]

    company = Company(name="Alpha Cloud", domain="alphacloud.com")
    db_session.add(company)
    await db_session.flush()

    sig1 = DetectedSignal(
        signal_id="dormant_strategic_account",
        company_id=company.id,
        owner_id=member.id,
        is_escalated=True,
        escalation_level="critical",
        status="active",
        severity="critical",
        score=Decimal("95.0"),
        title="Dormant Account: Alpha Cloud",
        summary="No touchpoints in 95 days.",
        metadata_payload={"priority_tier": "P0"},
    )
    sig2 = DetectedSignal(
        signal_id="unanswered_conversation",
        company_id=company.id,
        owner_id=None,  # Unassigned
        is_escalated=False,
        status="active",
        severity="medium",
        score=Decimal("50.0"),
        title="Unanswered Note",
        summary="Inquiry awaiting reply.",
        metadata_payload={"priority_tier": "P2"},
    )
    db_session.add_all([sig1, sig2])
    await db_session.commit()

    # 1. Filter by owner_id
    resp_owner = await client.get(f"/api/v1/signals/detected?owner_id={member.id}", headers=headers)
    assert resp_owner.status_code == 200
    data_owner = resp_owner.json()["data"]
    assert len(data_owner) == 1
    assert data_owner[0]["id"] == str(sig1.id)

    # 2. Filter by unassigned
    resp_unassigned = await client.get("/api/v1/signals/detected?unassigned=true", headers=headers)
    assert resp_unassigned.status_code == 200
    data_unassigned = resp_unassigned.json()["data"]
    assert any(s["id"] == str(sig2.id) for s in data_unassigned)

    # 3. Filter by is_escalated
    resp_esc = await client.get("/api/v1/signals/detected?is_escalated=true", headers=headers)
    assert resp_esc.status_code == 200
    data_esc = resp_esc.json()["data"]
    assert any(s["id"] == str(sig1.id) for s in data_esc)

    # 4. Check Stats API
    resp_stats = await client.get("/api/v1/signals/detected/stats", headers=headers)
    assert resp_stats.status_code == 200
    stats_data = resp_stats.json()
    assert stats_data["total_escalated"] >= 1
    assert stats_data["total_unassigned"] >= 1
