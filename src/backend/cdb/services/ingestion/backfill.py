import datetime
import logging
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.intake import (
    IntakeLinkedInConnection,
    IntakeLinkedInMessage,
    IntakeNotionMeetingNote,
)
from cdb.models.lead import Lead
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.services.entity_resolution.normalise import clean_company_name, generate_company_domain
from cdb.services.ingestion.signals import detect_message_metadata

logger = logging.getLogger(__name__)


async def backfill_linkedin_companies_and_relationships(db: AsyncSession) -> dict[str, Any]:
    """
    Backfills companies and person_company_relationships from intake_linkedin_connections.
    Resolves persons if not yet resolved, creates missing companies, and establishes employment links.
    """
    from cdb.services.entity_resolution.normalise import (
        normalise_email,
        normalise_linkedin_url,
    )

    stmt = select(IntakeLinkedInConnection).where(
        IntakeLinkedInConnection.company.is_not(None),
        IntakeLinkedInConnection.company != "",
    )
    rows = (await db.execute(stmt)).scalars().all()
    logger.info(
        "Found %d intake LinkedIn connection records with company info to process.", len(rows)
    )

    # Preload existing persons
    existing_persons = (
        (await db.execute(select(Person).where(Person.deleted_at.is_(None)))).scalars().all()
    )
    person_by_id: dict[Any, Person] = {p.id: p for p in existing_persons}
    person_by_li: dict[str, Person] = {
        p.linkedin_url.lower().strip(): p for p in existing_persons if p.linkedin_url
    }
    person_by_email: dict[str, Person] = {
        p.primary_email.lower().strip(): p for p in existing_persons if p.primary_email
    }
    person_by_name: dict[str, Person] = {
        f"{p.first_name or ''} {p.last_name or ''}".strip().lower(): p
        for p in existing_persons
        if (p.first_name or p.last_name)
    }

    # Preload existing companies
    existing_companies = (await db.execute(select(Company))).scalars().all()
    company_by_name: dict[str, Company] = {c.name.lower().strip(): c for c in existing_companies}
    company_by_domain: dict[str, Company] = {
        c.domain.lower().strip(): c for c in existing_companies if c.domain
    }

    # Preload existing relationships
    existing_rels = (await db.execute(select(PersonCompanyRelationship))).scalars().all()
    rel_set: set[tuple[Any, Any]] = {(r.person_id, r.company_id) for r in existing_rels}

    created_persons_count = 0
    created_companies_count = 0
    created_rels_count = 0

    for idx, intake in enumerate(rows, start=1):
        try:
            raw_comp = (intake.company or "").strip()
            if not raw_comp:
                continue

            # 1. Resolve or create person
            person_id = intake.resolved_person_id
            target_person = person_by_id.get(person_id) if person_id else None

            if not target_person:
                norm_li = normalise_linkedin_url(intake.profile_url)
                norm_email = normalise_email(intake.email_address)
                full_name = f"{intake.first_name or ''} {intake.last_name or ''}".strip().lower()

                if norm_li and norm_li in person_by_li:
                    target_person = person_by_li[norm_li]
                elif norm_email and norm_email in person_by_email:
                    target_person = person_by_email[norm_email]
                elif full_name and full_name in person_by_name:
                    target_person = person_by_name[full_name]

                if not target_person:
                    # Safe unique checks
                    safe_li = norm_li if (norm_li and norm_li not in person_by_li) else None
                    safe_email = (
                        norm_email if (norm_email and norm_email not in person_by_email) else None
                    )
                    target_person = Person(
                        first_name=intake.first_name,
                        last_name=intake.last_name,
                        primary_email=safe_email,
                        linkedin_url=safe_li,
                        sources=["linkedin"],
                        source_ids={"linkedin": intake.connection_id},
                    )
                    db.add(target_person)
                    await db.flush()
                    created_persons_count += 1
                    person_by_id[target_person.id] = target_person
                    if safe_li:
                        person_by_li[safe_li] = target_person
                    if safe_email:
                        person_by_email[safe_email] = target_person
                    if full_name:
                        person_by_name[full_name] = target_person

                intake.resolved_person_id = target_person.id
                intake.status = "resolved"

            # 2. Resolve or create company
            comp_clean = clean_company_name(raw_comp) or raw_comp
            comp_domain = generate_company_domain(raw_comp)

            comp = company_by_name.get(comp_clean.lower())
            if not comp:
                comp = company_by_name.get(raw_comp.lower())
            if not comp and comp_domain:
                comp = company_by_domain.get(comp_domain.lower())

            if not comp:
                final_domain = (
                    comp_domain
                    if (comp_domain and comp_domain.lower() not in company_by_domain)
                    else None
                )
                comp = Company(
                    name=comp_clean,
                    domain=final_domain,
                )
                db.add(comp)
                await db.flush()
                created_companies_count += 1
                company_by_name[comp_clean.lower()] = comp
                company_by_name[raw_comp.lower()] = comp
                if final_domain:
                    company_by_domain[final_domain.lower()] = comp

            # 3. Create or ensure relationship
            rel_key = (intake.resolved_person_id, comp.id)
            if rel_key not in rel_set:
                started_at = None
                if intake.connected_at:
                    started_at = (
                        intake.connected_at.date() if hasattr(intake.connected_at, "date") else None
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

            # Progress logging and periodic commit every 200 records
            if idx % 200 == 0 or idx == len(rows):
                await db.commit()
                logger.info(
                    "Processed %d/%d connections (created %d persons, %d companies, %d relationships)...",
                    idx,
                    len(rows),
                    created_persons_count,
                    created_companies_count,
                    created_rels_count,
                )
        except Exception as exc:
            logger.warning(
                "Error processing intake connection %s: %s",
                getattr(intake, "connection_id", "unknown"),
                exc,
            )
            continue

    await db.commit()
    logger.info(
        "LinkedIn backfill complete: %d new persons, %d new companies, %d new relationships created.",
        created_persons_count,
        created_companies_count,
        created_rels_count,
    )

    return {
        "status": "success",
        "processed_connections": len(rows),
        "created_persons": created_persons_count,
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

            occurred_at = getattr(msg, "last_sent_at", None)
            if not occurred_at and msg.raw_payload and isinstance(msg.raw_payload, dict):
                for dt_key in [
                    "last_sent_at",
                    "latest_message_date",
                    "sent_at",
                    "first_sent_at",
                    "created_at",
                ]:
                    val = msg.raw_payload.get(dt_key)
                    if val:
                        try:
                            occurred_at = datetime.datetime.fromisoformat(
                                str(val).replace("Z", "+00:00")
                            )
                            break
                        except Exception:
                            pass
            if not occurred_at:
                occurred_at = msg.ingested_at or datetime.datetime.now(datetime.UTC)

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


def clean_meeting_title(raw_title: str | None) -> str:
    if not raw_title:
        return "Notion Meeting Note"
    # Strip ISO timestamp suffixes like 2026-08-27T16:28:00.000+02:00
    cleaned = re.sub(r"\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*$", "", raw_title).strip()
    return cleaned or raw_title.strip()


async def backfill_notion_meeting_notes_into_activities(db: AsyncSession) -> dict[str, Any]:
    """
    Backfills all intake_notion_meeting_notes into the activities table.
    Intelligently links meetings with attendee persons from attendees list, meeting title, URL, or transcripts.
    """
    notes_stmt = select(IntakeNotionMeetingNote)
    notes = (await db.execute(notes_stmt)).scalars().all()
    logger.info("Found %d intake Notion meeting note records to backfill.", len(notes))

    existing_activities = (
        (await db.execute(select(Activity).where(Activity.source == "notion"))).scalars().all()
    )
    existing_act_by_source_id: dict[str, Activity] = {
        act.source_id: act for act in existing_activities if act.source_id
    }

    # Preload all active persons and their companies
    persons = (await db.execute(select(Person).where(Person.deleted_at.is_(None)))).scalars().all()
    companies = (await db.execute(select(Company))).scalars().all()

    # Preload relationships to know which company each person belongs to
    rels = (
        await db.execute(
            select(PersonCompanyRelationship, Company).join(
                Company, Company.id == PersonCompanyRelationship.company_id
            )
        )
    ).all()
    person_companies: dict[Any, list[str]] = {}
    person_company_ids: dict[Any, Any] = {}
    for r, c in rels:
        person_companies.setdefault(r.person_id, []).append((c.name or "").lower().strip())
        person_company_ids[r.person_id] = c.id

    jimmy = next(
        (
            p
            for p in persons
            if (p.first_name or "").strip().lower() == "jimmy"
            and (p.last_name or "").strip().lower() == "pang"
        ),
        None,
    )
    default_person_id = jimmy.id if jimmy else (persons[0].id if persons else None)

    created_meetings_count = 0
    updated_meetings_count = 0

    chunk_size = 50
    for i in range(0, len(notes), chunk_size):
        chunk = notes[i : i + chunk_size]
        for note in chunk:
            source_id = f"notion:{note.page_id}"
            clean_title = clean_meeting_title(note.title)

            # Combined text to search for candidate attendees & company affiliation (including intro/transcript snippet)
            content_snippet = (note.content or "")[:1000]
            search_corpus = f"{note.attendees or ''} {note.title or ''} {note.url or ''} {content_snippet}".lower()

            matched_person_id = None
            matched_company_id = None
            jimmy_person_id = None

            # 1. First search full name matches (prioritizing non-host attendees)
            for p in persons:
                first = (p.first_name or "").strip().lower()
                last = (p.last_name or "").strip().lower()
                if first and last and len(first) >= 2 and len(last) >= 2:
                    full_name = f"{first} {last}"
                    if re.search(rf"\b{re.escape(full_name)}\b", search_corpus):
                        if first == "jimmy" and last == "pang":
                            jimmy_person_id = p.id
                        else:
                            matched_person_id = p.id
                            break

            # 2. If no full name match, search first_name + company affiliation match (e.g. "Bendik" + "MotherDuck")
            if not matched_person_id:
                for p in persons:
                    first = (p.first_name or "").strip().lower()
                    if first and len(first) >= 3 and first != "jimmy":
                        if re.search(rf"\b{re.escape(first)}\b", search_corpus):
                            p_comps = person_companies.get(p.id, [])
                            if any(
                                re.search(rf"\b{re.escape(comp)}\b", search_corpus)
                                for comp in p_comps
                                if len(comp) >= 3
                            ):
                                matched_person_id = p.id
                                break

            # 3. If still no match, search distinctive first name in title patterns (e.g. "Joe", "Yarek", "Lauren/Jimmy", "Daniel x Jimmy")
            if not matched_person_id:
                title_lower = (note.title or "").lower()
                for p in persons:
                    first = (p.first_name or "").strip().lower()
                    if first and len(first) >= 3 and first != "jimmy":
                        pattern = rf"\b{re.escape(first)}\b"
                        if re.search(pattern, title_lower):
                            matched_person_id = p.id
                            break

            # Fallback to host contact if mentioned and no external person matched
            if not matched_person_id and jimmy_person_id:
                matched_person_id = jimmy_person_id

            # Link company from matched person if available
            if matched_person_id and matched_person_id in person_company_ids:
                matched_company_id = person_company_ids[matched_person_id]

            # If company still not matched, check companies directly in title/corpus
            if not matched_company_id:
                for c in companies:
                    cname = (c.name or "").strip().lower()
                    if cname and len(cname) >= 4 and cname not in ["data", "tech", "team", "consulting"]:
                        pattern = rf"\b{re.escape(cname)}\b"
                        if re.search(pattern, search_corpus):
                            matched_company_id = c.id
                            break

            # Satisfy check constraint ck_activities_person_or_company_required
            if not matched_person_id and not matched_company_id:
                matched_person_id = default_person_id

            occurred_at = (
                note.meeting_date or note.ingested_at or datetime.datetime.now(datetime.UTC)
            )

            # Check if activity already exists
            existing_act = existing_act_by_source_id.get(source_id)
            if existing_act:
                # Update person_id, company_id, title and content if improved
                updated = False
                if matched_person_id and existing_act.person_id != matched_person_id:
                    existing_act.person_id = matched_person_id
                    updated = True
                if matched_company_id and existing_act.company_id != matched_company_id:
                    existing_act.company_id = matched_company_id
                    updated = True
                if clean_title and existing_act.title != clean_title:
                    existing_act.title = clean_title
                    updated = True
                if note.content and (not existing_act.summary or len(note.content) > len(existing_act.summary)):
                    existing_act.summary = note.content
                    updated = True
                if note.content and (not existing_act.raw_content or len(note.content) > len(existing_act.raw_content)):
                    existing_act.raw_content = note.content
                    updated = True
                if updated:
                    updated_meetings_count += 1
            else:
                act = Activity(
                    person_id=matched_person_id,
                    company_id=matched_company_id,
                    type="meeting",
                    source="notion",
                    source_id=source_id,
                    occurred_at=occurred_at,
                    title=clean_title,
                    summary=note.content or f"Notion Meeting Note: {clean_title}",
                    raw_content=note.content,
                    attributes={
                        "database_name": note.database_name,
                        "url": note.url,
                        "to_dos": note.to_dos,
                        "attendees": note.attendees,
                    },
                )
                db.add(act)
                existing_act_by_source_id[source_id] = act
                created_meetings_count += 1

            note.status = "resolved" if matched_person_id else "ingested"

        await db.commit()

    logger.info(
        "Notion meeting notes backfill complete: %d activities created, %d updated.",
        created_meetings_count,
        updated_meetings_count,
    )

    return {
        "status": "success",
        "total_notes": len(notes),
        "created_activities": created_meetings_count,
        "updated_activities": updated_meetings_count,
    }


async def run_all_backfills(db: AsyncSession) -> dict[str, Any]:
    """
    Orchestrates the complete 1-off backfill:
    1. Backfills LinkedIn companies and employment relationships.
    2. Backfills LinkedIn messages into activities and leads.
    3. Backfills Notion meeting notes into activities.
    4. Re-evaluates dynamic segmentation and engagement temperature.
    """
    from cdb.services.segmentation.service import evaluate_segments_and_temperature

    logger.info(
        "Executing comprehensive backfill across companies, messages, notes, and segments..."
    )
    comp_res = await backfill_linkedin_companies_and_relationships(db)
    msg_res = await backfill_linkedin_messages_into_activities(db)
    notion_res = await backfill_notion_meeting_notes_into_activities(db)
    seg_res = await evaluate_segments_and_temperature(db)

    return {
        "status": "success",
        "companies_and_relationships": comp_res,
        "linkedin_messages": msg_res,
        "notion_meeting_notes": notion_res,
        "segmentation": seg_res,
    }


async def run_background_backfill_if_needed() -> None:
    """
    Background startup check that triggers 1-off backfilling if unlinked intake records exist.
    """
    from sqlalchemy import func

    from cdb.core.database import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            # Check if activities exist for LinkedIn messages
            msg_count = (
                await session.execute(select(func.count(IntakeLinkedInMessage.id)))
            ).scalar() or 0
            act_msg_count = (
                await session.execute(
                    select(func.count(Activity.id)).where(Activity.type == "linkedin_message")
                )
            ).scalar() or 0

            # Check if relationships exist for LinkedIn connections
            conn_count = (
                await session.execute(
                    select(func.count(IntakeLinkedInConnection.id)).where(
                        IntakeLinkedInConnection.company.is_not(None),
                        IntakeLinkedInConnection.company != "",
                    )
                )
            ).scalar() or 0
            rel_count = (
                await session.execute(select(func.count(PersonCompanyRelationship.id)))
            ).scalar() or 0

            if (msg_count > 0 and act_msg_count == 0) or (
                conn_count > 0 and rel_count < conn_count
            ):
                logger.info(
                    "Detected unbackfilled intake records (messages: %d vs activities: %d, connections: %d vs relationships: %d). Starting automatic background backfill...",
                    msg_count,
                    act_msg_count,
                    conn_count,
                    rel_count,
                )
                await run_all_backfills(session)
    except Exception as exc:
        logger.exception("Automatic background backfill encountered an error: %s", exc)
