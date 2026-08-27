import datetime
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.lead import Lead
from cdb.models.opportunity import Opportunity, OpportunityPerson
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship

PERSON_SEGMENT_RULES = [
    (
        "clients_and_prospects",
        "Clients & Prospects",
        "Active or past consulting clients and warm lead opportunities",
    ),
    (
        "former_colleagues_alumni",
        "Alumni & Former Colleagues",
        "Alumni network contacts from target companies (Hays, HelloFresh, Delivery Hero, Foodpanda, Vestiaire)",
    ),
    (
        "recruiters_and_talent",
        "Recruiters & Talent Acquisition",
        "Internal/agency recruiters, talent acquisition managers, talent partners, headhunters, and sourcers",
    ),
    (
        "hiring_decision_makers",
        "Hiring Decision-Makers",
        "Founders, CTOs, VPs of Data/Engineering, Heads, and hiring decision makers",
    ),
    (
        "peer_collaborators",
        "Peer Collaborators & Agencies",
        "Other consultants, agency owners, freelancers, tooling partners, or DevRel for project referrals/partnerships",
    ),
    (
        "general_network",
        "General Network",
        "General network contacts not belonging to specific opportunity segments",
    ),
]

RECRUITER_REGEX = re.compile(
    r"\b(recruiter|recruiting|talent acquisition|talent partner|talent manager|talent management|hr manager|headhunter|sourcer|talent specialist)\b",
    re.IGNORECASE,
)
DECISION_MAKER_REGEX = re.compile(
    r"\b(founder|co-founder|cofounder|owner|partner|chief|ceo|cto|cfo|coo|cmo|cpo|cro|cio|cdo|vp|vice president|head|director|lead|manager|executive|principal)\b",
    re.IGNORECASE,
)
ALUMNI_COMPANIES = ["hays", "hayes", "foodpanda", "delivery hero", "hellofresh", "hello fresh", "vestiaire"]
PEER_TOOLING_COMPANIES = ["dlthub", "dlt", "motherduck", "n8n", "airbyte", "dagster", "prefect", "duckdb", "snowflake", "databricks", "astronomer", "agency", "consulting", "advisory", "solutions"]


async def evaluate_segments_and_temperature(db: AsyncSession) -> dict[str, Any]:
    """
    Evaluates dynamic person segments, engagement temperatures, and tags across all Persons.
    """
    persons = (await db.execute(select(Person).where(Person.deleted_at.is_(None)))).scalars().all()

    now = datetime.datetime.now(datetime.UTC)
    cutoff_30d = now - datetime.timedelta(days=30)
    cutoff_90d = now - datetime.timedelta(days=90)

    person_segment_counts: dict[str, int] = {k[0]: 0 for k in PERSON_SEGMENT_RULES}
    temperature_counts: dict[str, int] = {"hot": 0, "warm": 0, "dormant": 0, "cold": 0}
    geo_counts: dict[str, int] = {}

    for person in persons:
        # 1. Fetch relationships & career
        rels_stmt = (
            select(PersonCompanyRelationship, Company)
            .join(Company, Company.id == PersonCompanyRelationship.company_id)
            .where(PersonCompanyRelationship.person_id == person.id)
        )
        rels = (await db.execute(rels_stmt)).all()
        titles = [r.title or "" for r, _ in rels]
        comp_names = [c.name.lower() for _, c in rels]

        # 2. Fetch activities & leads
        act_stmt = (
            select(Activity.occurred_at)
            .where(Activity.person_id == person.id)
            .order_by(Activity.occurred_at.desc())
        )
        activities = (await db.execute(act_stmt)).scalars().all()
        last_activity_date = activities[0] if activities else None

        leads_stmt = select(Lead).where(Lead.person_id == person.id)
        leads = (await db.execute(leads_stmt)).scalars().all()

        opps_stmt = (
            select(Opportunity)
            .join(OpportunityPerson, OpportunityPerson.opportunity_id == Opportunity.id)
            .where(OpportunityPerson.person_id == person.id)
        )
        opps = (await db.execute(opps_stmt)).scalars().all()

        # 3. Determine Segment (priority order)
        assigned_segment = "general_network"

        # Check clients and prospects
        has_client_signal = (
            len(opps) > 0
            or any(lead.intent in ["inbound_service_request", "business_collaboration"] for lead in leads)
            or any(lead.stage in ["qualified", "contacted"] for lead in leads)
        )
        if has_client_signal:
            assigned_segment = "clients_and_prospects"
        # Check alumni
        elif any(any(alum in cn for alum in ALUMNI_COMPANIES) for cn in comp_names):
            assigned_segment = "former_colleagues_alumni"
        # Check recruiters
        elif any(RECRUITER_REGEX.search(t) for t in titles):
            assigned_segment = "recruiters_and_talent"
        # Check decision makers
        elif any(DECISION_MAKER_REGEX.search(t) for t in titles):
            assigned_segment = "hiring_decision_makers"
        # Check peer collaborators
        elif any(any(pt in cn for pt in PEER_TOOLING_COMPANIES) for cn in comp_names):
            assigned_segment = "peer_collaborators"

        person_segment_counts[assigned_segment] += 1

        # 4. Determine Engagement Temperature
        temperature = "cold"
        if last_activity_date:
            # Ensure timezone awareness for comparison
            dt = last_activity_date if last_activity_date.tzinfo else last_activity_date.replace(tzinfo=datetime.UTC)
            if dt >= cutoff_30d:
                temperature = "hot"
            elif dt >= cutoff_90d:
                temperature = "warm"
            else:
                temperature = "dormant"
        elif len(leads) > 0:
            temperature = "warm"

        temperature_counts[temperature] += 1

        # 5. Build dynamic tags list
        tags = set(person.attributes.get("tags", []) if person.attributes else [])
        tags.add(f"segment:{assigned_segment}")
        tags.add(f"temp:{temperature}")
        if person.country:
            tags.add(f"geo:{person.country.lower()}")
            geo_counts[person.country.upper()] = geo_counts.get(person.country.upper(), 0) + 1
        if person.city:
            tags.add(f"city:{person.city.lower()}")

        # Update attributes on Person
        attr = dict(person.attributes or {})
        attr["segment"] = assigned_segment
        attr["engagement_temperature"] = temperature
        attr["tags"] = sorted(list(tags))
        attr["last_evaluated_at"] = now.isoformat()
        person.attributes = attr

    await db.commit()

    return {
        "status": "success",
        "total_persons_evaluated": len(persons),
        "person_segments": person_segment_counts,
        "engagement_temperatures": temperature_counts,
        "geo_breakdown": geo_counts,
    }
