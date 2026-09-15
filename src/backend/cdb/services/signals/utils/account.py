"""
cdb.services.signals.utils.account

Account resolution and entity name formatting utilities for signal detection.
Traverses entity relationships to find the affected Company ID.
"""

from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.opportunity import Opportunity, OpportunityCompany
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship


def get_person_display_name(person: Person | None, default: str = "Contact") -> str:
    """Returns the formatted full name for a person model or fallback default."""
    if not person:
        return default
    name = f"{person.first_name or ''} {person.last_name or ''}".strip()
    return name if name else default


def get_company_display_name(company: Company | None, default: str = "Company") -> str:
    """Returns company name or fallback default."""
    return company.name if company and company.name else default


async def resolve_engagement_opportunity(
    db: AsyncSession,
    engagement_id: Any | None,
) -> Any | None:
    """Resolves the associated Opportunity ID for a given engagement ID."""
    if not engagement_id:
        return None
    eng = await db.get(Engagement, engagement_id)
    return eng.opportunity_id if eng else None


async def get_strategic_companies(db: AsyncSession) -> list[Company]:
    """
    Fetches all companies qualifying as strategic:
    - Has a signed engagement OR a closed-won opportunity
    - Tagged with strategic segment ('clients_and_prospects') or tier ('strategic')
    """
    companies_stmt = (
        select(Company)
        .where(Company.deleted_at.is_(None))
        .join(Engagement, Engagement.company_id == Company.id, isouter=True)
        .join(Opportunity, Opportunity.id == Engagement.opportunity_id, isouter=True)
        .where(
            or_(
                Engagement.contract_status == "signed",
                Opportunity.stage == "closed_won",
            )
        )
        .distinct()
    )
    contract_companies = (await db.execute(companies_stmt)).scalars().all()
    strategic_set: dict[Any, Company] = {c.id: c for c in contract_companies}

    # Also include companies tagged with strategic attributes
    all_companies = (
        (await db.execute(select(Company).where(Company.deleted_at.is_(None)))).scalars().all()
    )
    for c in all_companies:
        if c.id not in strategic_set and c.attributes:
            if (
                c.attributes.get("segment") == "clients_and_prospects"
                or c.attributes.get("tier") == "strategic"
            ):
                strategic_set[c.id] = c

    return list(strategic_set.values())


async def resolve_account_for_signal(
    db: AsyncSession,
    company_id: Any | None = None,
    person_id: Any | None = None,
    opportunity_id: Any | None = None,
    engagement_id: Any | None = None,
    activity_id: Any | None = None,
) -> Any | None:
    """
    Resolves the affected account (Company ID) for any detected signal,
    guaranteeing account attribution by traversing relationships.
    """
    if company_id:
        return company_id

    if engagement_id:
        eng = await db.get(Engagement, engagement_id)
        if eng and eng.company_id:
            return eng.company_id
        if eng and eng.opportunity_id:
            opp_comp_stmt = (
                select(OpportunityCompany.company_id)
                .where(OpportunityCompany.opportunity_id == eng.opportunity_id)
                .limit(1)
            )
            c_id = (await db.execute(opp_comp_stmt)).scalars().first()
            if c_id:
                return c_id

    if opportunity_id:
        opp_comp_stmt = (
            select(OpportunityCompany.company_id)
            .where(OpportunityCompany.opportunity_id == opportunity_id)
            .limit(1)
        )
        c_id = (await db.execute(opp_comp_stmt)).scalars().first()
        if c_id:
            return c_id

    if activity_id:
        act = await db.get(Activity, activity_id)
        if act:
            if act.company_id:
                return act.company_id
            if act.engagement_id:
                eng = await db.get(Engagement, act.engagement_id)
                if eng and eng.company_id:
                    return eng.company_id
            if act.person_id and not person_id:
                person_id = act.person_id

    if person_id:
        # Check active current employment first
        rel_stmt = (
            select(PersonCompanyRelationship)
            .where(
                PersonCompanyRelationship.person_id == person_id,
                PersonCompanyRelationship.is_current.is_(True),
            )
            .order_by(PersonCompanyRelationship.started_at.desc().nullslast())
            .limit(1)
        )
        rel = (await db.execute(rel_stmt)).scalars().first()
        if rel and rel.company_id:
            return rel.company_id

        # Fallback to any past relationship
        past_rel_stmt = (
            select(PersonCompanyRelationship)
            .where(PersonCompanyRelationship.person_id == person_id)
            .order_by(PersonCompanyRelationship.ended_at.desc().nullslast())
            .limit(1)
        )
        past_rel = (await db.execute(past_rel_stmt)).scalars().first()
        if past_rel and past_rel.company_id:
            return past_rel.company_id

    return None


# Backward-compatible private alias
_resolve_account_for_signal = resolve_account_for_signal
