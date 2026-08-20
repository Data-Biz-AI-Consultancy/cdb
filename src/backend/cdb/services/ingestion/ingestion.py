import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.er import ERCandidatePair
from cdb.models.intake import (
    IntakeLinkedInConnection,
    IntakeLinkedInMessage,
    IntakeNotionMeetingNote,
)
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.schemas.ingestion import (
    IngestResponse,
    LinkedInConnectionsIngestRequest,
    LinkedInMessagesIngestRequest,
    NotionMeetingNotesIngestRequest,
)
from cdb.services.entity_resolution.normalise import (
    normalise_email,
    normalise_linkedin_url,
)
from cdb.services.entity_resolution.rules import evaluate_person_match


async def ingest_linkedin_connections(
    db: AsyncSession, data: LinkedInConnectionsIngestRequest
) -> IngestResponse:
    queued = 0
    duplicates_skipped = 0

    for rec in data.records:
        existing = (
            await db.execute(
                select(IntakeLinkedInConnection).where(
                    IntakeLinkedInConnection.connection_id == rec.connection_id
                )
            )
        ).scalar_one_or_none()

        if existing:
            duplicates_skipped += 1
            continue

        intake = IntakeLinkedInConnection(
            connection_id=rec.connection_id,
            first_name=rec.first_name,
            last_name=rec.last_name,
            profile_url=rec.profile_url,
            email_address=rec.email_address,
            company=rec.company,
            position=rec.position,
            connected_at=rec.connected_at,
            raw_payload=rec.raw_payload,
            status="pending",
        )
        db.add(intake)
        await db.flush()

        # Incremental resolution for this contact
        await _resolve_linkedin_connection(db, intake)
        queued += 1

    await db.commit()
    return IngestResponse(queued=queued, duplicates_skipped=duplicates_skipped)


async def _resolve_linkedin_connection(db: AsyncSession, intake: IntakeLinkedInConnection) -> None:
    norm_email = normalise_email(intake.email_address)
    norm_li = normalise_linkedin_url(intake.profile_url)

    # Candidate person record to test against existing persons
    target_person = Person(
        first_name=intake.first_name,
        last_name=intake.last_name,
        primary_email=norm_email,
        linkedin_url=norm_li,
        sources=["linkedin"],
        source_ids={"linkedin": intake.connection_id},
    )

    # Check all active persons for potential match
    all_persons = (await db.execute(select(Person).where(Person.deleted_at.is_(None)))).scalars().all()

    matched_person: Person | None = None
    for p in all_persons:
        res = evaluate_person_match(target_person, p)
        if res.outcome == "auto_merge":
            matched_person = p
            # Merge fields into existing master
            if not p.first_name and intake.first_name:
                p.first_name = intake.first_name
            if not p.last_name and intake.last_name:
                p.last_name = intake.last_name
            if norm_email and norm_email != p.primary_email:
                sec = list(p.secondary_emails or [])
                if norm_email not in sec:
                    sec.append(norm_email)
                p.secondary_emails = sec
            if norm_li and not p.linkedin_url:
                p.linkedin_url = norm_li
            if "linkedin" not in (p.sources or []):
                p.sources = list((p.sources or []) + ["linkedin"])
            s_ids = dict(p.source_ids or {})
            s_ids["linkedin"] = intake.connection_id
            p.source_ids = s_ids
            break
        elif res.outcome == "review_queue":
            # In Phase 1 review queue requires two persisted persons; if candidate doesn't match auto-merge, create new person and queue candidate pair
            pass

    if not matched_person:
        matched_person = target_person
        db.add(matched_person)
        await db.flush()

        # Check for review queue pairs with newly created person
        for p in all_persons:
            res = evaluate_person_match(matched_person, p)
            if res.outcome == "review_queue":
                db.add(
                    ERCandidatePair(
                        person_a_id=p.id,
                        person_b_id=matched_person.id,
                        match_signals=res.match_signals,
                        status="pending",
                    )
                )

    intake.status = "resolved"
    intake.resolved_person_id = matched_person.id

    # If company provided, create/link company and relationship
    if intake.company:
        comp_name = intake.company.strip()
        comp = (
            await db.execute(select(Company).where(Company.name.ilike(comp_name)))
        ).scalar_one_or_none()
        if not comp:
            comp = Company(name=comp_name)
            db.add(comp)
            await db.flush()

        # Add relationship
        existing_rel = (
            await db.execute(
                select(PersonCompanyRelationship).where(
                    PersonCompanyRelationship.person_id == matched_person.id,
                    PersonCompanyRelationship.company_id == comp.id,
                )
            )
        ).scalar_one_or_none()

        if not existing_rel:
            db.add(
                PersonCompanyRelationship(
                    person_id=matched_person.id,
                    company_id=comp.id,
                    title=intake.position,
                    is_current=True,
                )
            )


async def ingest_linkedin_messages(
    db: AsyncSession, data: LinkedInMessagesIngestRequest
) -> IngestResponse:
    queued = 0
    duplicates_skipped = 0

    for rec in data.records:
        existing = (
            await db.execute(
                select(IntakeLinkedInMessage).where(
                    IntakeLinkedInMessage.conversation_id == rec.conversation_id
                )
            )
        ).scalar_one_or_none()

        if existing:
            duplicates_skipped += 1
            continue

        intake = IntakeLinkedInMessage(
            conversation_id=rec.conversation_id,
            participant_names=rec.participant_names,
            message_count=rec.message_count,
            raw_content=rec.raw_content,
            raw_payload=rec.raw_payload,
            status="pending",
        )
        db.add(intake)
        await db.flush()

        # Log as Activity
        act = Activity(
            type="linkedin_message",
            source="linkedin",
            source_id=f"li_msg:{rec.conversation_id}",
            occurred_at=datetime.datetime.now(datetime.UTC),
            title=f"LinkedIn Conversation ({rec.message_count} messages)",
            summary=rec.participant_names,
            raw_content=rec.raw_content,
        )
        # Attempt to link if participant matches an existing person
        if rec.participant_names:
            first_name_match = rec.participant_names.split(",")[0].strip()
            p = (
                await db.execute(
                    select(Person).where(
                        (Person.first_name + " " + Person.last_name).ilike(f"%{first_name_match}%")
                    )
                )
            ).scalars().first()
            if p:
                act.person_id = p.id
                intake.resolved_person_id = p.id

        db.add(act)
        intake.status = "resolved"
        queued += 1

    await db.commit()
    return IngestResponse(queued=queued, duplicates_skipped=duplicates_skipped)


async def ingest_notion_meeting_notes(
    db: AsyncSession, data: NotionMeetingNotesIngestRequest
) -> IngestResponse:
    queued = 0
    duplicates_skipped = 0

    for rec in data.records:
        existing = (
            await db.execute(
                select(IntakeNotionMeetingNote).where(
                    IntakeNotionMeetingNote.page_id == rec.page_id
                )
            )
        ).scalar_one_or_none()

        if existing:
            duplicates_skipped += 1
            continue

        intake = IntakeNotionMeetingNote(
            page_id=rec.page_id,
            database_name=rec.database_name,
            title=rec.title,
            meeting_date=rec.meeting_date,
            attendees=rec.attendees,
            summary=rec.summary,
            to_dos=rec.to_dos,
            url=rec.url,
            raw_payload=rec.raw_payload,
            status="pending",
        )
        db.add(intake)
        await db.flush()

        # Create Activity for meeting note
        act = Activity(
            type="meeting",
            source="notion",
            source_id=f"notion:{rec.page_id}",
            occurred_at=rec.meeting_date or datetime.datetime.now(datetime.UTC),
            title=rec.title or "Notion Meeting",
            summary=rec.summary,
            raw_content=str(rec.to_dos),
            attributes={"url": rec.url, "attendees": rec.attendees},
        )

        if rec.attendees:
            first_attendee = rec.attendees.split(",")[0].strip()
            p = (
                await db.execute(
                    select(Person).where(
                        (Person.first_name + " " + Person.last_name).ilike(f"%{first_attendee}%")
                    )
                )
            ).scalars().first()
            if p:
                act.person_id = p.id

        db.add(act)
        intake.status = "resolved"
        queued += 1

    await db.commit()
    return IngestResponse(queued=queued, duplicates_skipped=duplicates_skipped)
