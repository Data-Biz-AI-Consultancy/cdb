import datetime
import logging
import re
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.intake import IntakeLinkedInConnection, IntakeLinkedInMessage, IntakeNotionMeetingNote
from cdb.models.lead import Lead
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.services.entity_resolution.normalise import clean_company_name, generate_company_domain
from cdb.services.ingestion.signals import detect_message_metadata

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

    existing_companies = (await db.execute(select(Company))).scalars().all()
    company_by_name: dict[str, Company] = {c.name.lower().strip(): c for c in existing_companies}
    company_by_domain: dict[str, Company] = {
        c.domain.lower().strip(): c for c in existing_companies if c.domain
    }

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


async def backfill_linkedin_messages_into_activities(db: AsyncSession) -> dict[str, Any]:
    """
    Backfills all intake_linkedin_messages into the activities table.
    Ensures that conversation transcripts are linked to persons and visible in the activity timeline.
    """
    messages_stmt = select(IntakeLinkedInMessage)
    messages = (await db.execute(messages_stmt)).scalars().all()
    logger.info("Found %d intake LinkedIn message records to backfill.", len(messages))

    existing_act_sources = (
        (await db.execute(select(Activity.source_id).where(Activity.source_id.is_not(None))))
        .scalars()
        .all()
    )
    existing_sources_set = set(existing_act_sources)

    persons = (await db.execute(select(Person).where(Person.deleted_at.is_(None)))).scalars().all()
    person_by_name: dict[str, Person] = {}
    for p in persons:
        full_name = f"{p.first_name or ''} {p.last_name or ''}".strip().lower()
        if full_name:
            person_by_name[full_name] = p

    created_activities_count = 0
    created_leads_count = 0

    chunk_size = 50
    for i in range(0, len(messages), chunk_size):
        chunk = messages[i : i + chunk_size]
        for msg in chunk:
            source_id = f"li_msg:{msg.conversation_id}"
            if source_id in existing_sources_set:
                continue

            person_id = msg.resolved_person_id
            if not person_id and msg.participant_names:
                clean_name = msg.participant_names.strip().lower()
                matched_p = person_by_name.get(clean_name)
                if not matched_p:
                    for p_name, p_obj in person_by_name.items():
                        if clean_name in p_name or p_name in clean_name:
                            matched_p = p_obj
                            break
                if matched_p:
                    person_id = matched_p.id
                    msg.resolved_person_id = matched_p.id
                    msg.status = "resolved"

            if not person_id:
                continue

            occurred_at = msg.ingested_at or datetime.datetime.now(datetime.UTC)
            if msg.raw_payload and isinstance(msg.raw_payload, dict):
                for dt_key in ["last_sent_at", "latest_message_date", "first_sent_at", "created_at"]:
                    val = msg.raw_payload.get(dt_key)
                    if val:
                        try:
                            occurred_at = datetime.datetime.fromisoformat(val.replace("Z", "+00:00"))
                            break
                        except Exception:
                            pass

            signals = detect_message_metadata(msg.raw_content)
            title = f"LinkedIn Conversation with {msg.participant_names or 'Contact'} ({msg.message_count} messages)"
            summary_text = (
                f"Intent: {signals.get('intent', 'General Networking')} | "
                f"Opportunity: {signals.get('opportunity_type', 'Networking')}"
            )

            act = Activity(
                person_id=person_id,
                type="linkedin_message",
                source="linkedin",
                source_id=source_id,
                occurred_at=occurred_at,
                title=title,
                summary=summary_text,
                raw_content=msg.raw_content,
                attributes=signals,
            )
            db.add(act)
            existing_sources_set.add(source_id)
            created_activities_count += 1

            if signals.get("signal_strength") in ["strong", "medium"]:
                existing_lead = (
                    (
                        await db.execute(
                            select(Lead).where(
                                (Lead.person_id == person_id)
                                | (Lead.source_ref_id == f"li_convo:{msg.conversation_id}")
                            )
                        )
                    )
                    .scalars()
                    .first()
                )

                if not existing_lead:
                    lead_notes = (
                        f"LinkedIn conversation with {msg.participant_names} ({msg.message_count} messages).\n"
                        f"Opportunity Type: {signals.get('opportunity_type', 'General')}"
                    )
                    db.add(
                        Lead(
                            person_id=person_id,
                            source="linkedin_message",
                            source_ref_id=f"li_convo:{msg.conversation_id}",
                            stage="new",
                            intent=signals.get("intent", "Networking / Consulting"),
                            signal_strength=signals.get("signal_strength", "medium"),
                            notes=lead_notes,
                        )
                    )
                    created_leads_count += 1

        await db.commit()

    logger.info(
        "LinkedIn messages backfill complete: %d activities created, %d leads generated.",
        created_activities_count,
        created_leads_count,
    )

    return {
        "status": "success",
        "total_messages": len(messages),
        "created_activities": created_activities_count,
        "created_leads": created_leads_count,
    }


async def backfill_notion_meeting_notes_into_activities(db: AsyncSession) -> dict[str, Any]:
    """
    Backfills all intake_notion_meeting_notes into the activities table.
    Links meetings with primary attendee persons and creates activity records.
    """
    notes_stmt = select(IntakeNotionMeetingNote)
    notes = (await db.execute(notes_stmt)).scalars().all()
    logger.info("Found %d intake Notion meeting note records to backfill.", len(notes))

    existing_act_sources = (
        (await db.execute(select(Activity.source_id).where(Activity.source_id.is_not(None))))
        .scalars()
        .all()
    )
    existing_sources_set = set(existing_act_sources)

    persons = (await db.execute(select(Person).where(Person.deleted_at.is_(None)))).scalars().all()
    person_by_name: dict[str, Person] = {}
    for p in persons:
        full_name = f"{p.first_name or ''} {p.last_name or ''}".strip().lower()
        if full_name:
            person_by_name[full_name] = p

    created_meetings_count = 0

    chunk_size = 50
    for i in range(0, len(notes), chunk_size):
        chunk = notes[i : i + chunk_size]
        for note in chunk:
            source_id = f"notion:{note.page_id}"
            if source_id in existing_sources_set:
                continue

            person_id = None
            if note.attendees:
                att_lower = note.attendees.lower()
                for p_name, p_obj in person_by_name.items():
                    if len(p_name) > 4 and (p_name in att_lower or att_lower in p_name):
                        person_id = p_obj.id
                        break

            if not person_id:
                continue

            occurred_at = note.meeting_date or note.ingested_at or datetime.datetime.now(datetime.UTC)

            act = Activity(
                person_id=person_id,
                type="meeting",
                source="notion",
                source_id=source_id,
                occurred_at=occurred_at,
                title=note.title or "Notion Meeting Note",
                summary=note.summary or (f"Meeting with {note.attendees}" if note.attendees else "Notion meeting notes"),
                raw_content=note.summary,
                attributes={
                    "database_name": note.database_name,
                    "url": note.url,
                    "to_dos": note.to_dos,
                    "attendees": note.attendees,
                },
            )
            db.add(act)
            existing_sources_set.add(source_id)
            created_meetings_count += 1

        await db.commit()

    logger.info("Notion meeting notes backfill complete: %d activities created.", created_meetings_count)

    return {
        "status": "success",
        "total_notes": len(notes),
        "created_activities": created_meetings_count,
    }
