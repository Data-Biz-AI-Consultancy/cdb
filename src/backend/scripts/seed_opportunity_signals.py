import asyncio
import datetime
import logging
import uuid
from decimal import Decimal

from sqlalchemy import select

from cdb.core.database import AsyncSessionLocal
from cdb.models.company import Company
from cdb.models.opportunity import Opportunity, OpportunityCompany, OpportunityPerson
from cdb.models.signal import DetectedSignal, Signal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_opportunity_signals():
    async with AsyncSessionLocal() as session:
        logger.info("Checking existing signals catalog...")
        catalog_stmt = select(Signal)
        catalog_res = await session.execute(catalog_stmt)
        signals_catalog = {s.id: s for s in catalog_res.scalars().all()}

        if not signals_catalog:
            logger.warning("No signal definitions in catalog. Creating default catalog items...")
            default_signals = [
                Signal(
                    id="dormant_strategic_account",
                    name="Dormant Strategic Account",
                    category="risk",
                    target_entity="company",
                    severity="high",
                    business_interpretation="Key revenue client with zero touchpoints in over 30 days.",
                    recommended_action={"playbook": "executive_check_in"},
                ),
                Signal(
                    id="unanswered_conversation",
                    name="Unanswered Conversation",
                    category="risk",
                    target_entity="person",
                    severity="high",
                    business_interpretation="Inbound client communication awaiting response > 7 days.",
                    recommended_action={"playbook": "immediate_follow_up"},
                ),
                Signal(
                    id="hiring_funding_event",
                    name="Hiring or Funding Expansion",
                    category="opportunity",
                    target_entity="company",
                    severity="medium",
                    business_interpretation="Target account raised new venture round or expanding engineering team.",
                    recommended_action={"playbook": "expansion_pitch"},
                ),
                Signal(
                    id="competitor_signal",
                    name="Competitor Evaluation Risk",
                    category="risk",
                    target_entity="opportunity",
                    severity="critical",
                    business_interpretation="Client evaluated competitor tools or mentioned competitive pricing in recent discussions.",
                    recommended_action={"playbook": "competitive_differentiation_brief"},
                ),
                Signal(
                    id="leadership_change",
                    name="Executive Leadership Change",
                    category="opportunity",
                    target_entity="company",
                    severity="high",
                    business_interpretation="New VP or C-Level decision-maker joined target organization.",
                    recommended_action={"playbook": "welcome_outreach_intro"},
                ),
            ]
            for s in default_signals:
                session.add(s)
            await session.flush()
            catalog_res = await session.execute(catalog_stmt)
            signals_catalog = {s.id: s for s in catalog_res.scalars().all()}

        logger.info("Fetching opportunities...")
        opp_stmt = select(Opportunity)
        opp_res = await session.execute(opp_stmt)
        opportunities = opp_res.scalars().all()

        if not opportunities:
            logger.info(
                "No opportunities found. Fetching companies to create sample opportunities..."
            )
            comp_stmt = select(Company).limit(5)
            comp_res = await session.execute(comp_stmt)
            companies = comp_res.scalars().all()

            for idx, comp in enumerate(companies or []):
                new_opp = Opportunity(
                    id=uuid.uuid4(),
                    title=f"{comp.name} Enterprise Expansion",
                    description="Strategic platform adoption & multi-year expansion program.",
                    stage=["prospect", "qualified", "proposal", "negotiation"][idx % 4],
                    value=Decimal(str(65000 + idx * 25000)),
                    currency="USD",
                    probability=40 + idx * 15,
                    expected_close_date=datetime.date.today()
                    + datetime.timedelta(days=20 + idx * 10),
                    notes="Key stakeholder alignment meeting scheduled for this month.",
                )
                session.add(new_opp)
                await session.flush()

                # Attach company
                opp_comp = OpportunityCompany(
                    opportunity_id=new_opp.id,
                    company_id=comp.id,
                    role="client",
                )
                session.add(opp_comp)

            await session.flush()
            opp_res = await session.execute(select(Opportunity))
            opportunities = opp_res.scalars().all()

        now = datetime.datetime.now(datetime.UTC)
        created_count = 0

        # Load all company links
        comp_links_stmt = select(OpportunityCompany)
        comp_links_res = await session.execute(comp_links_stmt)
        comp_links_by_opp: dict[uuid.UUID, list[uuid.UUID]] = {}
        for link in comp_links_res.scalars().all():
            comp_links_by_opp.setdefault(link.opportunity_id, []).append(link.company_id)

        # Load all person links
        person_links_stmt = select(OpportunityPerson)
        person_links_res = await session.execute(person_links_stmt)
        person_links_by_opp: dict[uuid.UUID, list[uuid.UUID]] = {}
        for link in person_links_res.scalars().all():
            person_links_by_opp.setdefault(link.opportunity_id, []).append(link.person_id)

        # Load company names
        all_comps_stmt = select(Company)
        all_comps_res = await session.execute(all_comps_stmt)
        company_names = {c.id: c.name for c in all_comps_res.scalars().all()}

        for idx, opp in enumerate(opportunities):
            comp_ids = comp_links_by_opp.get(opp.id, [])
            comp_id = comp_ids[0] if comp_ids else None
            comp_name = company_names.get(comp_id) if comp_id else None

            person_ids = person_links_by_opp.get(opp.id, [])
            person_id = person_ids[0] if person_ids else None

            # 1. Create a Risk Signal
            risk_sig_id = "dormant_strategic_account" if idx % 2 == 0 else "competitor_signal"
            if risk_sig_id in signals_catalog:
                sig_risk = DetectedSignal(
                    id=uuid.uuid4(),
                    signal_id=risk_sig_id,
                    company_id=comp_id,
                    opportunity_id=opp.id,
                    person_id=person_id,
                    status="active",
                    severity="high" if risk_sig_id == "dormant_strategic_account" else "critical",
                    score=Decimal("88.00"),
                    title=f"⚠️ {signals_catalog[risk_sig_id].name} on '{opp.title}'",
                    summary=f"Automated risk detection triggered for {comp_name or opp.title}. Inactive touchpoints detected over 30 days during deal progression.",
                    evidence_fingerprint=f"seed_risk_{opp.id}_{now.timestamp()}",
                    metadata_payload={
                        "urgency": "immediate",
                        "why_it_matters_now": "Deal is currently in active pipeline but stakeholder engagement dropped by 60% over the last 3 weeks.",
                        "evidence": {
                            "evidence_type": "cadence_drop",
                            "occurred_at": (now - datetime.timedelta(days=12)).isoformat(),
                            "excerpt": "Last interaction was 24 days ago regarding proposal review & commercial terms.",
                            "verification_status": "verified",
                            "source_reliability": "high",
                        },
                        "commercial_context": {
                            "pipeline_value": str(opp.value or 50000),
                            "stage": opp.stage,
                        },
                    },
                    detected_at=now - datetime.timedelta(days=1),
                )
                session.add(sig_risk)
                created_count += 1

            # 2. Create an Opportunity Signal
            opp_sig_id = "hiring_funding_event" if idx % 2 == 0 else "leadership_change"
            if opp_sig_id in signals_catalog:
                sig_opp = DetectedSignal(
                    id=uuid.uuid4(),
                    signal_id=opp_sig_id,
                    company_id=comp_id,
                    opportunity_id=opp.id,
                    person_id=person_id,
                    status="active",
                    severity="medium",
                    score=Decimal("76.50"),
                    title=f"🚀 Growth Signal: {signals_catalog[opp_sig_id].name} for {comp_name or opp.title}",
                    summary="Commercial expansion trigger detected: Key executive hire in infrastructure and newly allocated digital transformation budget.",
                    evidence_fingerprint=f"seed_opp_{opp.id}_{now.timestamp()}",
                    metadata_payload={
                        "urgency": "high",
                        "why_it_matters_now": "New VP of Engineering appointed with clear mandate to accelerate cloud modernization.",
                        "evidence": {
                            "evidence_type": "enrichment_feed",
                            "occurred_at": (now - datetime.timedelta(days=3)).isoformat(),
                            "excerpt": "Public announcement: Appointed new Head of Cloud & Enterprise Architecture.",
                            "verification_status": "verified",
                            "source_reliability": "high",
                        },
                    },
                    detected_at=now - datetime.timedelta(hours=14),
                )
                session.add(sig_opp)
                created_count += 1

        await session.commit()
        logger.info("Successfully seeded %d test signals across opportunities!", created_count)


if __name__ == "__main__":
    asyncio.run(seed_opportunity_signals())
