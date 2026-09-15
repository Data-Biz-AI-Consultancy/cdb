import asyncio
import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.database import AsyncSessionLocal
from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.intake import IntakeNotionMeetingNote
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.services.ingestion.notion_resolver import NotionAttendeeIndex
from cdb.services.signals.detector import evaluate_all_signals

logger = logging.getLogger(__name__)


async def heal_notion_entities(db: AsyncSession) -> dict:
    """
    Re-runs comprehensive NotionEntityDetector across all historical Notion meeting notes,
    correcting activity counterparties, companies, and detected signals.
    """
    # 1. Load context
    persons = (await db.execute(select(Person).where(Person.deleted_at.is_(None)))).scalars().all()
    companies = (await db.execute(select(Company))).scalars().all()
    rels = (
        await db.execute(
            select(PersonCompanyRelationship, Company).join(
                Company, Company.id == PersonCompanyRelationship.company_id
            )
        )
    ).all()

    person_companies: dict[UUID, list[str]] = {}
    person_company_ids: dict[UUID, UUID] = {}
    for r, c in rels:
        c_norm = (c.name or "").lower().strip()
        if c_norm:
            person_companies.setdefault(r.person_id, []).append(c_norm)
        person_company_ids[r.person_id] = c.id

    attendee_index = NotionAttendeeIndex(
        persons=persons,
        companies=companies,
        person_companies=person_companies,
        person_company_ids=person_company_ids,
    )

    intake_notes = (await db.execute(select(IntakeNotionMeetingNote))).scalars().all()
    healed_activities = 0

    notion_activities = (
        (await db.execute(select(Activity).where(Activity.source == "notion"))).scalars().all()
    )
    act_by_source_id = {act.source_id: act for act in notion_activities}

    for note in intake_notes:
        res = attendee_index.detect_meeting_entities(
            title=note.title,
            attendees=note.attendees,
            url=note.url,
            content=note.content,
        )

        note.title = res.clean_title
        if res.primary_person_id:
            note.status = "resolved"

        # Update matching Activity
        act = act_by_source_id.get(f"notion:{note.page_id}")
        if act:
            act.person_id = res.primary_person_id
            if res.company_id:
                act.company_id = res.company_id
            act.title = res.clean_title
            act_attr = dict(act.attributes or {})
            act_attr["entities"] = [e.to_dict() for e in res.entities]
            act_attr["suggested_persons"] = res.suggested_persons
            act.attributes = act_attr
            healed_activities += 1

    await db.commit()

    # Re-evaluate all signals with 90-day lookback window
    eval_res = await evaluate_all_signals(db, lookback_days=90)
    await db.commit()

    return {
        "status": "success",
        "total_notes_processed": len(intake_notes),
        "healed_activities": healed_activities,
        "evaluation_summary": eval_res,
    }


async def main():
    async with AsyncSessionLocal() as session:
        result = await heal_notion_entities(session)
        print("Heal result:", result)


if __name__ == "__main__":
    asyncio.run(main())
