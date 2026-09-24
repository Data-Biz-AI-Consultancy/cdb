import datetime
import uuid
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.security import create_access_token
from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.opportunity import Opportunity, OpportunityCompany
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.signal import DetectedSignal, Signal
from cdb.models.user import User
from cdb.schemas.nba import ActionType
from cdb.schemas.signals import (
    DetectedSignalResponse,
    DetectedSignalStatus,
    SignalDefinition,
    SupportingEvidenceResponse,
)
from cdb.services.signals.nba import (
    generate_next_best_actions,
)


@pytest.fixture
async def auth_headers(db_session: AsyncSession) -> dict[str, str]:
    user = User(
        email="advisor_test@example.com",
        hashed_pw="hashed_pw",
        full_name="Advisor Test",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_generate_next_best_actions_deduplication_and_conflict():
    comp_id = uuid.uuid4()
    person_id = uuid.uuid4()
    now = datetime.datetime.now(datetime.UTC)

    # Risk signal (dormant account)
    sig1 = DetectedSignalResponse(
        id=uuid.uuid4(),
        signal_id="dormant_strategic_account",
        title="Dormant Strategic Account Alert",
        detected_at=now,
        created_at=now,
        updated_at=now,
        company_id=comp_id,
        company_name="Acme Corp",
        person_id=person_id,
        person_name="Alice Smith",
        status=DetectedSignalStatus.ACTIVE,
        severity="high",
        priority_score=Decimal("80.0"),
        priority_tier="P1",
        effective_polarity="RISK",
        confidence_score=Decimal("0.9"),
        has_conflict=True,
        conflict_summary="Dormant account detected alongside recent funding round",
        signal=SignalDefinition(
            id="dormant_strategic_account",
            name="Dormant Strategic Account",
            category="risk",
            target_entity="company",
            severity="high",
            business_interpretation="Inactivity risk",
        ),
        evidence=SupportingEvidenceResponse(
            evidence_type="temporal_inactivity",
            source_entity_type="company",
            evidence_status="fresh",
            why_it_matters_now="Client relationship is at risk of churn.",
        ),
    )

    # Opportunity signal (funding event)
    sig2 = DetectedSignalResponse(
        id=uuid.uuid4(),
        signal_id="hiring_funding_event",
        title="Hiring or Funding Event Alert",
        detected_at=now,
        created_at=now,
        updated_at=now,
        company_id=comp_id,
        company_name="Acme Corp",
        person_id=person_id,
        person_name="Alice Smith",
        status=DetectedSignalStatus.ACTIVE,
        severity="medium",
        priority_score=Decimal("75.0"),
        priority_tier="P1",
        effective_polarity="OPPORTUNITY",
        confidence_score=Decimal("0.85"),
        has_conflict=True,
        conflict_summary="Recent Series B funding round detected",
        signal=SignalDefinition(
            id="hiring_funding_event",
            name="Hiring or Funding Event",
            category="opportunity",
            target_entity="company",
            severity="medium",
            business_interpretation="Growth upside",
        ),
        evidence=SupportingEvidenceResponse(
            evidence_type="text_pattern",
            source_entity_type="company",
            evidence_status="fresh",
            why_it_matters_now="Client secured new capital allocation.",
        ),
    )

    actions = generate_next_best_actions([sig1, sig2], company_name="Acme Corp")
    assert len(actions) > 0

    # Verify a reconciled action exists
    reconciled = next((a for a in actions if a.is_reconciled_conflict), None)
    assert reconciled is not None
    assert reconciled.action_type == ActionType.RECONCILED_OUTREACH
    assert "Acme Corp" in (reconciled.target_company_name or "")
    assert reconciled.category == "reconciled"
    assert len(reconciled.originating_signal_ids) == 2
    assert reconciled.priority_score >= 70.0


@pytest.mark.asyncio
async def test_nba_api_endpoints(
    client: AsyncClient, db_session: AsyncSession, auth_headers: dict[str, str]
):
    # Create signal definitions
    sig_def1 = Signal(
        id="dormant_strategic_account",
        name="Dormant Strategic Account",
        category="risk",
        target_entity="company",
        severity="high",
        business_interpretation="Account dormancy",
        recommended_action={
            "playbook": "executive_touchpoint",
            "action_type": "schedule_sync",
            "title": "Schedule Check-In",
        },
    )
    db_session.add(sig_def1)

    company = Company(
        id=uuid.uuid4(),
        name="Global Corp",
        domain="globalcorp.com",
        industry="Technology",
    )
    db_session.add(company)
    await db_session.flush()

    det_sig = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="dormant_strategic_account",
        company_id=company.id,
        title="Dormant Strategic Account: Global Corp",
        status="active",
        severity="high",
        score=Decimal("82.0"),
    )
    db_session.add(det_sig)
    await db_session.commit()

    # 1. Test Company NBA endpoint
    res = await client.get(
        f"/api/v1/companies/{company.id}/next-best-actions",
        headers=auth_headers,
    )
    assert res.status_code == 200
    nba_data = res.json()
    assert nba_data["total_count"] >= 1
    assert nba_data["data"][0]["target_company_name"] == "Global Corp"
    assert nba_data["data"][0]["priority_tier"] in ("P0", "P1")

    # 2. Test Global NBA feed
    res_feed = await client.get(
        "/api/v1/signals/nba/feed",
        headers=auth_headers,
    )
    assert res_feed.status_code == 200
    feed_data = res_feed.json()
    assert feed_data["total_count"] >= 1


@pytest.mark.asyncio
async def test_ai_account_brief_synthesis_and_api(
    client: AsyncClient, db_session: AsyncSession, auth_headers: dict[str, str]
):
    company = Company(
        id=uuid.uuid4(),
        name="Apex Industries",
        domain="apexindustries.com",
        industry="Manufacturing",
    )
    db_session.add(company)

    person = Person(
        id=uuid.uuid4(),
        first_name="John",
        last_name="Doe",
        primary_email="john@apexindustries.com",
    )
    db_session.add(person)
    await db_session.flush()

    rel = PersonCompanyRelationship(
        id=uuid.uuid4(),
        company_id=company.id,
        person_id=person.id,
        title="VP of Engineering",
        is_current=True,
    )
    db_session.add(rel)

    eng = Engagement(
        id=uuid.uuid4(),
        company_id=company.id,
        title="Digital Transformation Advisory",
        status="active",
        contract_status="signed",
        total_value=Decimal("120000.00"),
        currency="EUR",
    )
    db_session.add(eng)

    opp = Opportunity(
        id=uuid.uuid4(),
        title="Supply Chain Analytics Expansion",
        stage="proposal",
        value=Decimal("80000.00"),
        currency="EUR",
    )
    db_session.add(opp)
    await db_session.flush()

    opp_link = OpportunityCompany(
        opportunity_id=opp.id,
        company_id=company.id,
    )
    db_session.add(opp_link)

    sig_def = Signal(
        id="hiring_funding_event",
        name="Hiring or Funding Event",
        category="opportunity",
        target_entity="company",
        severity="medium",
        business_interpretation="Scaling activity",
    )
    db_session.add(sig_def)
    await db_session.flush()

    det_sig = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="hiring_funding_event",
        company_id=company.id,
        person_id=person.id,
        title="Hiring or Funding Event: Apex Industries",
        status="active",
        severity="medium",
        score=Decimal("70.0"),
        metadata_payload={
            "evidence": {
                "evidence_type": "text_pattern",
                "source_entity_type": "company",
                "why_it_matters_now": "Rapid hiring in analytics.",
                "excerpt": "Apex Industries is recruiting 15 new engineers.",
                "evidence_status": "fresh",
            }
        },
    )
    db_session.add(det_sig)
    await db_session.commit()

    # 1. Test GET AI Account Brief
    res = await client.get(
        f"/api/v1/companies/{company.id}/ai-brief",
        headers=auth_headers,
    )
    assert res.status_code == 200
    brief = res.json()
    assert brief["company_name"] == "Apex Industries"
    assert brief["commercial_posture"] in ("growing", "stable")
    assert brief["relationship_health_score"] >= 70
    assert len(brief["key_opportunities"]) >= 1
    assert brief["key_opportunities"][0]["title"] == "Hiring or Funding Event"
    assert len(brief["active_engagements"]) == 1
    assert len(brief["open_pipeline_deals"]) == 1
    assert len(brief["recommended_next_actions"]) >= 1

    # 2. Test POST Regenerate AI Account Brief
    res_regen = await client.post(
        f"/api/v1/companies/{company.id}/ai-brief/regenerate",
        headers=auth_headers,
    )
    assert res_regen.status_code == 200
    regen_brief = res_regen.json()
    assert regen_brief["company_name"] == "Apex Industries"
