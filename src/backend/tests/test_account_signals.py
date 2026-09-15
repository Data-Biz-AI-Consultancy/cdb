import datetime
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.base import utc_now
from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.opportunity import Opportunity
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.signal import DetectedSignal
from cdb.services.signals.detector import (
    _resolve_account_for_signal,
    detect_competitor_signals,
    detect_hiring_funding_events,
    detect_unanswered_conversations,
    evaluate_all_signals,
)


@pytest.mark.asyncio
async def test_resolve_account_for_signal_hierarchy(db_session: AsyncSession):
    """Verifies that _resolve_account_for_signal traverses relationships to resolve the affected company."""
    # 1. Direct company
    comp_id = uuid.uuid4()
    resolved = await _resolve_account_for_signal(db_session, company_id=comp_id)
    assert resolved == comp_id

    # 2. Via Engagement
    comp_eng = Company(name="Engagement Corp")
    db_session.add(comp_eng)
    await db_session.flush()

    eng = Engagement(
        company_id=comp_eng.id,
        title="Delivery Sprint",
        status="active",
        contract_status="signed",
    )
    db_session.add(eng)
    await db_session.flush()

    resolved_eng = await _resolve_account_for_signal(db_session, engagement_id=eng.id)
    assert resolved_eng == comp_eng.id

    # 3. Via Person with active relationship
    comp_person = Company(name="Person Employer Corp")
    db_session.add(comp_person)
    person = Person(first_name="Jane", last_name="Doe", primary_email="jane@corp.io")
    db_session.add(person)
    await db_session.flush()

    rel = PersonCompanyRelationship(
        person_id=person.id,
        company_id=comp_person.id,
        title="Head of Engineering",
        is_current=True,
    )
    db_session.add(rel)
    await db_session.flush()

    resolved_person = await _resolve_account_for_signal(db_session, person_id=person.id)
    assert resolved_person == comp_person.id


@pytest.mark.asyncio
async def test_detect_hiring_funding_from_enrichment_data(db_session: AsyncSession):
    """Verifies detection of hiring & funding opportunity signals from Company.attributes enrichment."""
    now = utc_now()

    # Company with funding enrichment
    comp_funding = Company(
        name="Apex Robotics",
        attributes={
            "funding": {
                "round": "Series B",
                "amount": "$25M",
                "announced_date": "2026-08-15",
            },
            "tier": "strategic",
        },
    )
    # Company with headcount growth enrichment
    comp_hiring = Company(
        name="DataScale Systems",
        attributes={
            "headcount_growth": {
                "growth_rate_pct": 45,
                "open_roles": 14,
            },
            "segment": "clients_and_prospects",
        },
    )
    db_session.add_all([comp_funding, comp_hiring])
    await db_session.commit()

    results = await detect_hiring_funding_events(db_session, now)
    detected_comps = {r[0].company_id: r[0] for r in results}

    assert comp_funding.id in detected_comps
    funding_sig = detected_comps[comp_funding.id]
    assert funding_sig.signal_id == "hiring_funding_event"
    assert "Series B" in funding_sig.title
    assert funding_sig.metadata_payload.get("company_name") == "Apex Robotics"
    assert funding_sig.metadata_payload.get("evidence", {}).get("account_name") == "Apex Robotics"
    assert (
        funding_sig.metadata_payload.get("evidence", {}).get("key_metrics", {}).get("event_type")
        == "funding"
    )

    assert comp_hiring.id in detected_comps
    hiring_sig = detected_comps[comp_hiring.id]
    assert hiring_sig.signal_id == "hiring_funding_event"
    assert "+45% growth" in hiring_sig.title
    assert hiring_sig.metadata_payload.get("company_name") == "DataScale Systems"
    assert (
        hiring_sig.metadata_payload.get("evidence", {}).get("key_metrics", {}).get("event_type")
        == "hiring_expansion"
    )


@pytest.mark.asyncio
async def test_unanswered_conversation_resolves_affected_account(db_session: AsyncSession):
    """Verifies that an unanswered conversation signal resolves the affected account via Person relationship."""
    now = utc_now()
    cutoff_4d = now - datetime.timedelta(days=4)

    comp = Company(name="BioTech Solutions")
    person = Person(first_name="Marcus", last_name="Brody", primary_email="marcus@biotech.com")
    db_session.add_all([comp, person])
    await db_session.flush()

    rel = PersonCompanyRelationship(
        person_id=person.id,
        company_id=comp.id,
        title="Director of Data",
        is_current=True,
    )
    # Activity without explicit company_id, only person_id
    inbound_msg = Activity(
        person_id=person.id,
        company_id=None,
        source="email",
        type="email",
        title="Inquiry regarding Snowflake optimization",
        summary="Looking for architectural consulting on warehouse modernization.",
        occurred_at=cutoff_4d,
    )
    db_session.add_all([rel, inbound_msg])
    await db_session.commit()

    results = await detect_unanswered_conversations(db_session, now)
    matching = [r[0] for r in results if r[0].person_id == person.id]

    assert len(matching) == 1
    sig = matching[0]
    # Affected account is guaranteed and resolved!
    assert sig.company_id == comp.id
    assert sig.metadata_payload.get("company_name") == "BioTech Solutions"
    assert sig.metadata_payload.get("evidence", {}).get("account_name") == "BioTech Solutions"


@pytest.mark.asyncio
async def test_competitor_signal_resolves_affected_account(db_session: AsyncSession):
    """Verifies competitor signal resolves the affected company via opportunity."""
    from cdb.models.opportunity import OpportunityCompany

    now = utc_now()
    comp = Company(name="FinCorp Global")
    db_session.add(comp)
    await db_session.flush()

    opp = Opportunity(
        title="FinCorp Lakehouse Migration",
        stage="proposal",
    )
    db_session.add(opp)
    await db_session.flush()

    opp_comp = OpportunityCompany(
        opportunity_id=opp.id,
        company_id=comp.id,
        role="client",
    )
    db_session.add(opp_comp)

    eng = Engagement(
        company_id=comp.id,
        opportunity_id=opp.id,
        title="Proof of Concept",
        status="active",
        contract_status="draft",
    )
    db_session.add(eng)
    await db_session.flush()

    # Activity references engagement_id but no company_id directly
    act = Activity(
        engagement_id=eng.id,
        company_id=None,
        source="meeting",
        type="meeting",
        title="Tech evaluation bake-off against Slalom",
        summary="Client mentions evaluating alternative proposal and bake-off against Slalom.",
        occurred_at=now - datetime.timedelta(days=2),
    )
    db_session.add(act)
    await db_session.commit()

    results = await detect_competitor_signals(db_session, now)
    matching = [r[0] for r in results if r[0].activity_id == act.id]

    assert len(matching) == 1
    sig = matching[0]
    assert sig.company_id == comp.id
    assert sig.opportunity_id == opp.id


@pytest.mark.asyncio
async def test_evaluate_all_signals_comprehensive(db_session: AsyncSession):
    """Verifies evaluate_all_signals detects initial catalog across activity, engagement, contract, and enrichment."""
    now = utc_now()

    # 1. Company with contract expiring
    comp1 = Company(name="Alpha Cloud Corp")
    db_session.add(comp1)
    await db_session.flush()

    eng = Engagement(
        company_id=comp1.id,
        title="Cloud Advisory",
        status="active",
        contract_status="signed",
        expected_end_date=(now + datetime.timedelta(days=20)).date(),
    )
    db_session.add(eng)

    # 2. Company with enrichment funding
    comp2 = Company(
        name="Beta AI Labs",
        attributes={"funding_stage": "Series A", "total_funding": "$10M"},
    )
    db_session.add(comp2)

    # 3. Company dormant strategic account
    comp3 = Company(
        name="Gamma Legacy Client",
        attributes={"segment": "clients_and_prospects"},
    )
    db_session.add(comp3)
    await db_session.flush()

    # Gamma has a signed engagement from 100 days ago, no recent activity
    eng_old = Engagement(
        company_id=comp3.id,
        title="Legacy Retainer",
        status="completed",
        contract_status="signed",
    )
    db_session.add(eng_old)

    await db_session.commit()

    stats = await evaluate_all_signals(db_session)
    assert stats["status"] == "success"
    assert stats["total_active_signals"] >= 3

    # Verify each active signal in database identifies an affected account
    active_signals = (
        (await db_session.execute(select(DetectedSignal).where(DetectedSignal.status == "active")))
        .scalars()
        .all()
    )
    for sig in active_signals:
        assert sig.company_id is not None, f"Signal {sig.signal_id} is missing affected account"
        assert sig.title is not None
        assert "evidence" in sig.metadata_payload
