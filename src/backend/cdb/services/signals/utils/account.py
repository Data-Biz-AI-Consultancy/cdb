"""
cdb.services.signals.utils.account

Account resolution utilities for signal detection.
Traverses entity relationships to find the affected Company ID.
"""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.engagement import Engagement
from cdb.models.opportunity import OpportunityCompany
from cdb.models.relationship import PersonCompanyRelationship


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
