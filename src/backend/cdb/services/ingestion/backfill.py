import logging
import re
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.company import Company
from cdb.models.intake import IntakeLinkedInConnection
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.services.entity_resolution.normalise import clean_company_name, generate_company_domain

logger = logging.getLogger(__name__)


async def backfill_linkedin_companies_and_relationships(db: AsyncSession) -> dict[str, Any]:
    """
    Backfills companies and person_company_relationships from intake_linkedin_connections.
    Creates missing companies and associates resolved persons with their respective company and position.
    """
    stmt = select(IntakeLinkedInConnection).where(
        IntakeLinkedInConnection.resolved_person_id.is_not(None),
        IntakeLinkedInConnection.company.is_not(None),
        IntakeLinkedInConnection.company != "",
    )
    rows = (await db.execute(stmt)).scalars().all()
    logger.info("Found %d intake LinkedIn connection records with company info to process.", len(rows))

    # Preload existing companies into cache by name and domain
    existing_companies = (await db.execute(select(Company))).scalars().all()
    company_by_name: dict[str, Company] = {c.name.lower().strip(): c for c in existing_companies}
    company_by_domain: dict[str, Company] = {
        c.domain.lower().strip(): c for c in existing_companies if c.domain
    }

    # Preload existing relationships: (person_id, company_id)
    existing_rels = (await db.execute(select(PersonCompanyRelationship))).scalars().all()
    rel_set: set[tuple[Any, Any]] = {(r.person_id, r.company_id) for r in existing_rels}

    created_companies_count = 0
    created_rels_count = 0

    for intake in rows:
        raw_comp = (intake.company or "").strip()
        if not raw_comp:
            continue

        comp_clean = clean_company_name(raw_comp) or raw_comp
        comp_domain = generate_company_domain(raw_comp)

        # Lookup company in cache
        comp = company_by_name.get(comp_clean.lower())
        if not comp and comp_domain:
            comp = company_by_domain.get(comp_domain.lower())

        if not comp:
            comp = Company(
                name=comp_clean,
                domain=comp_domain or None,
            )
            db.add(comp)
            await db.flush()
            created_companies_count += 1
            company_by_name[comp_clean.lower()] = comp
            if comp_domain:
                company_by_domain[comp_domain.lower()] = comp

        # Check relationship
        rel_key = (intake.resolved_person_id, comp.id)
        if rel_key not in rel_set:
            started_at = None
            if intake.connected_at:
                started_at = (
                    intake.connected_at.date()
                    if hasattr(intake.connected_at, "date")
                    else None
                )

            rel = PersonCompanyRelationship(
                person_id=intake.resolved_person_id,
                company_id=comp.id,
                title=intake.position.strip() if intake.position else None,
                is_current=True,
                started_at=started_at,
            )
            db.add(rel)
            rel_set.add(rel_key)
            created_rels_count += 1

    await db.commit()
    logger.info(
        "LinkedIn backfill complete: %d new companies, %d new relationships created.",
        created_companies_count,
        created_rels_count,
    )

    return {
        "status": "success",
        "processed_connections": len(rows),
        "created_companies": created_companies_count,
        "created_relationships": created_rels_count,
        "total_relationships": len(rel_set),
    }
