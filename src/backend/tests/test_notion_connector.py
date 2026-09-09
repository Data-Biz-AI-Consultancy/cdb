import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import ValidationError
from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.intake import IntakeNotionMeetingNote
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.schemas.ingestion import (
    NotionMeetingNoteRecord,
    NotionMeetingNotesIngestRequest,
)
from cdb.services.connectors.notion import (
    NotionConnectorService,
    format_uuid,
    parse_flexible_datetime,
)
from cdb.services.ingestion.backfill import backfill_notion_meeting_notes_into_activities
from cdb.services.ingestion.ingestion import ingest_notion_meeting_notes
from cdb.workers.tasks import (
    _sync_notion_direct_async,
    sync_notion_direct_background,
)


def test_format_uuid():
    raw_32 = "3876e98d4ef8807eab9be1b0b029246c"
    formatted = format_uuid(raw_32)
    assert formatted == "3876e98d-4ef8-807e-ab9b-e1b0b029246c"

    # Already formatted
    assert (
        format_uuid("3876e98d-4ef8-807e-ab9b-e1b0b029246c")
        == "3876e98d-4ef8-807e-ab9b-e1b0b029246c"
    )
    assert format_uuid("") == ""


def test_parse_flexible_datetime():
    dt1 = parse_flexible_datetime("2024-06-15T10:00:00Z")
    assert dt1 == datetime.datetime(2024, 6, 15, 10, 0, tzinfo=datetime.UTC)

    dt2 = parse_flexible_datetime("2024-06-15 14:30:00")
    assert dt2.year == 2024 and dt2.hour == 14

    dt3 = parse_flexible_datetime("2024-06-15")
    assert dt3.year == 2024 and dt3.month == 6 and dt3.day == 15

    dt4 = parse_flexible_datetime("06/15/2024")
    assert dt4.year == 2024 and dt4.month == 6 and dt4.day == 15

    dt5 = parse_flexible_datetime("15/06/2024")
    assert dt5.year == 2024 and dt5.month == 6 and dt5.day == 15

    assert parse_flexible_datetime(None) is None
    assert parse_flexible_datetime("") is None
    assert parse_flexible_datetime("invalid-date-format-xyz") is None


def test_parse_meeting_note_all_property_types_and_blocks():
    service = NotionConnectorService(api_key="test-key")

    raw_page = {
        "id": "page-full-123",
        "url": "https://notion.so/page-full-123",
        "created_time": "2024-07-01T09:00:00Z",
        "parent": {"database_id": "db-abc"},
        "properties": {
            "Name": {
                "type": "title",
                "title": [
                    {"type": "text", "plain_text": "Meeting with Client "},
                    {
                        "type": "mention",
                        "mention": {
                            "type": "date",
                            "date": {"start": "2024-07-01T10:00:00.000+02:00"},
                        },
                        "plain_text": "2024-07-01T10:00:00.000+02:00",
                    },
                ],
            },
            "Meeting Date": {"type": "date", "date": {"start": "2024-07-01T10:00:00Z"}},
            "Invited Attendees": {
                "type": "people",
                "people": [
                    {"name": "Alice Cooper", "person": {"email": "alice@example.com"}},
                    {"id": "user-uuid-without-name"},
                ],
            },
            "Summary Notes": {
                "type": "rich_text",
                "rich_text": [{"plain_text": "Detailed strategic alignment and project overview."}],
            },
            "Next Step Action Items": {
                "type": "rich_text",
                "rich_text": [{"plain_text": "Send contract proposal\nSchedule follow-up"}],
            },
            "Score": {"type": "number", "number": 95},
            "Category": {"type": "select", "select": {"name": "Strategic"}},
            "Tags": {
                "type": "multi_select",
                "multi_select": [{"name": "AI"}, {"name": "Enterprise"}],
            },
            "FollowUpRequired": {"type": "checkbox", "checkbox": True},
            "ProjectURL": {"type": "url", "url": "https://company.internal/projects"},
            "ContactEmail": {"type": "email", "email": "contact@partner.com"},
            "Created time": {"type": "created_time", "created_time": "2024-07-01T09:00:00Z"},
            "Last edited time": {
                "type": "last_edited_time",
                "last_edited_time": "2024-07-01T09:30:00Z",
            },
        },
    }

    raw_blocks = [
        {
            "type": "heading_1",
            "heading_1": {"rich_text": [{"plain_text": "Meeting Objectives"}]},
        },
        {
            "type": "bulleted_list_item",
            "bulleted_list_item": {
                "rich_text": [{"plain_text": "Discuss architecture refactoring"}]
            },
        },
        {
            "type": "numbered_list_item",
            "numbered_list_item": {"rich_text": [{"plain_text": "Review SLA deliverables"}]},
        },
        {
            "type": "quote",
            "quote": {"rich_text": [{"plain_text": "Quality is not an act, it is a habit."}]},
        },
        {
            "type": "callout",
            "callout": {"rich_text": [{"plain_text": "Key milestone deadline is end of month."}]},
        },
        {
            "type": "to_do",
            "to_do": {
                "checked": False,
                "rich_text": [{"plain_text": "Draft initial pull request"}],
            },
        },
        {
            "type": "to_do",
            "to_do": {
                "checked": True,
                "rich_text": [{"plain_text": "Review database migration schema"}],
            },
        },
    ]

    record = service.parse_meeting_note(raw_page, blocks=raw_blocks)

    assert record.page_id == "page-full-123"
    assert "Meeting with Client" in record.title
    assert record.meeting_date is not None
    assert "Alice Cooper" in (record.attendees or "")
    assert "Detailed strategic alignment" in (record.content or "")
    assert "Detailed strategic alignment" in (record.summary or "")  # backwards compatibility alias
    assert len(record.to_dos) == 2
    assert "[ ] Draft initial pull request" in record.to_dos
    assert "[x] Review database migration schema" in record.to_dos


def test_parse_meeting_note_regex_date_in_title():
    service = NotionConnectorService(api_key="test-key")

    raw_page = {
        "id": "page-regex-date",
        "url": "https://notion.so/page-regex-date",
        "properties": {
            "Name": {
                "type": "title",
                "title": [{"plain_text": "Interview with Forto 2026-08-24T09:35:00.000+02:00"}],
            }
        },
    }

    record = service.parse_meeting_note(raw_page, blocks=[])
    assert record.page_id == "page-regex-date"
    assert record.meeting_date == datetime.datetime(2026, 8, 24, 7, 35, tzinfo=datetime.UTC)


@pytest.mark.asyncio
async def test_fetch_database_pages_pagination():
    service = NotionConnectorService(api_key="secret-key")

    mock_client = AsyncMock()
    # First response has has_more=True and next_cursor
    resp1 = MagicMock(spec=Response)
    resp1.status_code = 200
    resp1.json.return_value = {
        "results": [{"id": "page-batch-1"}],
        "has_more": True,
        "next_cursor": "cursor-token-abc",
    }
    # Second response terminates pagination
    resp2 = MagicMock(spec=Response)
    resp2.status_code = 200
    resp2.json.return_value = {
        "results": [{"id": "page-batch-2"}],
        "has_more": False,
        "next_cursor": None,
    }
    mock_client.post.side_effect = [resp1, resp2]

    pages = await service.fetch_database_pages(
        "3876e98d4ef8807eab9be1b0b029246c",
        client=mock_client,
        filter_criteria={"property": "Status", "select": {"equals": "Done"}},
    )
    assert len(pages) == 2
    assert pages[0]["id"] == "page-batch-1"
    assert pages[1]["id"] == "page-batch-2"
    assert mock_client.post.call_count == 2


@pytest.mark.asyncio
async def test_fetch_page_blocks_pagination_and_error():
    service = NotionConnectorService(api_key="secret-key")

    mock_client = AsyncMock()
    resp1 = MagicMock(spec=Response)
    resp1.status_code = 200
    resp1.json.return_value = {
        "results": [{"type": "paragraph", "paragraph": {"rich_text": [{"plain_text": "Block 1"}]}}],
        "has_more": True,
        "next_cursor": "cursor-block-2",
    }
    # Simulate API error on second batch
    resp2 = MagicMock(spec=Response)
    resp2.status_code = 500
    mock_client.get.side_effect = [resp1, resp2]

    blocks = await service.fetch_page_blocks("page-err-test", client=mock_client)
    assert len(blocks) == 1
    assert blocks[0]["paragraph"]["rich_text"][0]["plain_text"] == "Block 1"


@pytest.mark.asyncio
async def test_sync_from_notion_api_success_and_empty():
    service = NotionConnectorService(api_key="secret-key", database_ids=["test-db"])
    mock_db = AsyncMock(spec=AsyncSession)

    # 1. Empty database test
    with patch.object(service, "fetch_database_pages", new_callable=AsyncMock) as mock_fetch_empty:
        mock_fetch_empty.return_value = []
        res_empty = await service.sync_from_notion_api(mock_db)
        assert res_empty["status"] == "success"
        assert res_empty["total_fetched"] == 0
        assert res_empty["queued"] == 0

    # 2. Database with pages test
    page_data = {
        "id": "p-sync-1",
        "url": "https://notion.so/p-1",
        "created_time": "2024-08-01T12:00:00Z",
        "properties": {
            "Title": {"type": "title", "title": [{"plain_text": "Meeting with Client"}]},
        },
    }

    with (
        patch.object(service, "fetch_database_pages", new_callable=AsyncMock) as mock_fetch,
        patch.object(service, "fetch_page_blocks", new_callable=AsyncMock) as mock_blocks,
        patch(
            "cdb.services.connectors.notion.ingest_notion_meeting_notes", new_callable=AsyncMock
        ) as mock_ingest,
    ):
        mock_fetch.return_value = [page_data]
        mock_blocks.return_value = []
        mock_ingest.return_value = MagicMock(queued=1, duplicates_skipped=0)

        res = await service.sync_from_notion_api(mock_db)
        assert res["status"] == "success"
        assert res["total_fetched"] == 1
        assert res["queued"] == 1


@pytest.mark.asyncio
async def test_sync_from_jager_db():
    service = NotionConnectorService()
    mock_db = AsyncMock(spec=AsyncSession)

    # Test error if no Jager URL
    with patch("cdb.core.config.settings.JAGER_DATABASE_URL", None):
        with pytest.raises(ValidationError, match="JAGER_DATABASE_URL is not configured"):
            await service.sync_from_jager_db(mock_db)

    # Test successful pull from Jager DB
    mock_engine = MagicMock()
    mock_conn = MagicMock()
    mock_engine.connect.return_value.__enter__.return_value = mock_conn

    mock_row = {
        "page_id": "jager-page-001",
        "database_name": "Interview Meeting notes",
        "title": "Interview Note",
        "meeting_date": datetime.datetime(2024, 8, 20, 10, 0, tzinfo=datetime.UTC),
        "attendees": "Alice Cooper",
        "summary": "Notes summary",
        "action_items": "Send follow-up email",
        "url": "https://notion.so/jager-001",
    }

    mock_cursor = MagicMock()
    mock_cursor.mappings.return_value.all.return_value = [mock_row]
    mock_conn.execute.return_value = mock_cursor

    with (
        patch("sqlalchemy.create_engine", return_value=mock_engine),
        patch(
            "cdb.services.connectors.notion.ingest_notion_meeting_notes", new_callable=AsyncMock
        ) as mock_ingest,
    ):
        mock_ingest.return_value = MagicMock(queued=1, duplicates_skipped=0)

        result = await service.sync_from_jager_db(
            mock_db, jager_db_url="postgresql://test:test@localhost:5432/jager"
        )
        assert result["status"] == "success"
        assert result["total_fetched"] == 1
        assert result["queued"] == 1


@pytest.mark.asyncio
async def test_sync_modes_routing():
    service = NotionConnectorService(api_key="secret-key")
    mock_db = AsyncMock(spec=AsyncSession)

    with (
        patch.object(service, "sync_from_notion_api", new_callable=AsyncMock) as mock_api_sync,
        patch.object(service, "sync_from_jager_db", new_callable=AsyncMock) as mock_db_sync,
    ):
        mock_api_sync.return_value = {"status": "api"}
        mock_db_sync.return_value = {"status": "db"}

        # Explicit mode: notion_api
        res1 = await service.sync(mock_db, source="notion_api")
        assert res1["status"] == "api"

        # Explicit mode: jager_db
        res2 = await service.sync(mock_db, source="jager_db")
        assert res2["status"] == "db"

        # Auto mode with api key
        res3 = await service.sync(mock_db, source="auto")
        assert res3["status"] == "api"


@pytest.mark.asyncio
async def test_sync_unconfigured_error():
    mock_db = AsyncMock(spec=AsyncSession)

    with (
        patch("cdb.core.config.settings.NOTION_API_KEY", None),
        patch("cdb.core.config.settings.JAGER_DATABASE_URL", None),
    ):
        service = NotionConnectorService(api_key=None, database_ids=[])
        with pytest.raises(ValidationError, match="Neither NOTION_API_KEY nor JAGER_DATABASE_URL"):
            await service.sync(mock_db, source="auto")


@pytest.mark.asyncio
async def test_celery_task_async_worker():
    # Test _sync_notion_direct_async
    with (
        patch("cdb.workers.tasks.AsyncSessionLocal"),
        patch(
            "cdb.services.connectors.notion.NotionConnectorService.sync", new_callable=AsyncMock
        ) as mock_sync,
    ):
        mock_sync.return_value = {"status": "success", "queued": 5}
        res = await _sync_notion_direct_async(source="auto")
        assert res["status"] == "success"
        assert res["queued"] == 5


def test_sync_notion_direct_background():
    with patch("cdb.workers.tasks.asyncio.run") as mock_run:
        mock_run.return_value = {"status": "celery_done"}
        res = sync_notion_direct_background(source="auto")
        assert res["status"] == "celery_done"
        mock_run.assert_called_once()


@pytest.mark.asyncio
async def test_notion_connector_endpoints(client: AsyncClient):
    headers = {"X-API-Key": "development-api-key"}

    # Test GET status
    resp = await client.get("/api/v1/connectors/notion/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["connector"] == "notion"
    assert "api_configured" in data
    assert "jager_db_configured" in data
    assert "database_count" in data

    # Test POST sync async dispatch
    with patch("cdb.workers.tasks.sync_notion_direct_background.delay") as mock_delay:
        mock_task = MagicMock()
        mock_task.id = "task-notion-456"
        mock_delay.return_value = mock_task

        post_resp = await client.post(
            "/api/v1/connectors/notion/sync?async_run=true",
            headers=headers,
        )
        assert post_resp.status_code == 200
        post_data = post_resp.json()
        assert post_data["status"] == "queued"
        assert post_data["task_id"] == "task-notion-456"

    # Test POST sync inline execution (async_run=false)
    with patch(
        "cdb.api.v1.connectors.NotionConnectorService.sync", new_callable=AsyncMock
    ) as mock_sync:
        mock_sync.return_value = {"status": "success", "queued": 2, "duplicates_skipped": 0}
        sync_resp = await client.post(
            "/api/v1/connectors/notion/sync?async_run=false",
            headers=headers,
        )
        assert sync_resp.status_code == 200
        sync_data = sync_resp.json()
        assert sync_data["status"] == "success"
        assert sync_data["queued"] == 2

    # Test fallback to inline when celery dispatch raises exception
    with (
        patch(
            "cdb.workers.tasks.sync_notion_direct_background.delay",
            side_effect=Exception("Redis down"),
        ),
        patch(
            "cdb.api.v1.connectors.NotionConnectorService.sync", new_callable=AsyncMock
        ) as mock_fallback_sync,
    ):
        mock_fallback_sync.return_value = {"status": "fallback_inline"}
        fallback_resp = await client.post(
            "/api/v1/connectors/notion/sync?async_run=true",
            headers=headers,
        )
        assert fallback_resp.status_code == 200
        assert fallback_resp.json()["status"] == "fallback_inline"


def test_parse_meeting_note_unlimited_text_1m_chars():
    service = NotionConnectorService(api_key="test-key")
    # Generate 1.2 million characters of transcription across multiple blocks
    chunk = (
        "Speaker 1: Explaining system architecture and end-to-end data pipeline requirements.\n"
        * 15000
    )  # ~1.25M chars
    assert len(chunk) > 1_000_000

    raw_page = {
        "id": "page-huge-transcript",
        "properties": {
            "Name": {"type": "title", "title": [{"plain_text": "Long 4-Hour Architecture Review"}]}
        },
    }
    raw_blocks = [
        {
            "type": "quote",
            "quote": {"rich_text": [{"plain_text": chunk}]},
            "children": [
                {
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"plain_text": "Final concluding remarks after 4 hours."}]
                    },
                }
            ],
        }
    ]

    record = service.parse_meeting_note(raw_page, blocks=raw_blocks)
    assert record.content is not None
    assert len(record.content) > 1_000_000
    assert "Final concluding remarks after 4 hours." in record.content
    assert record.summary == record.content
    assert record.raw_payload["blocks_count"] == 2


@pytest.mark.asyncio
async def test_fetch_page_blocks_recursive_child_blocks():
    service = NotionConnectorService(api_key="test-key")
    mock_client = AsyncMock()

    # Top-level page response has 1 quote block with has_children=True
    resp_top = MagicMock(spec=Response)
    resp_top.status_code = 200
    resp_top.json.return_value = {
        "results": [
            {
                "id": "quote-block-1",
                "type": "quote",
                "has_children": True,
                "quote": {"rich_text": [{"plain_text": "Top quote block"}]},
            }
        ],
        "has_more": False,
    }

    # Child response has 1 paragraph block with has_children=False
    resp_child = MagicMock(spec=Response)
    resp_child.status_code = 200
    resp_child.json.return_value = {
        "results": [
            {
                "id": "child-p-1",
                "type": "paragraph",
                "has_children": False,
                "paragraph": {"rich_text": [{"plain_text": "Child transcription inside quote"}]},
            }
        ],
        "has_more": False,
    }

    mock_client.get.side_effect = [resp_top, resp_child]

    blocks = await service.fetch_page_blocks("test-page", client=mock_client, recursive=True)
    assert len(blocks) == 1
    assert "children" in blocks[0]
    assert len(blocks[0]["children"]) == 1
    assert (
        blocks[0]["children"][0]["paragraph"]["rich_text"][0]["plain_text"]
        == "Child transcription inside quote"
    )


def test_notion_meeting_note_record_summary_backwards_compatibility():
    # Test that passing 'summary' in a legacy payload seamlessly populates 'content'
    raw_dict = {
        "page_id": "legacy-page-1",
        "title": "Legacy Payload Meeting",
        "summary": "This was passed as summary in JSON",
    }
    record = NotionMeetingNoteRecord.model_validate(raw_dict)
    assert record.content == "This was passed as summary in JSON"
    assert record.summary == "This was passed as summary in JSON"

    # Test explicit content field
    direct_dict = {
        "page_id": "new-page-2",
        "title": "Modern Payload Meeting",
        "content": "This is direct content",
    }
    record2 = NotionMeetingNoteRecord.model_validate(direct_dict)
    assert record2.content == "This is direct content"
    assert record2.summary == "This is direct content"


@pytest.mark.asyncio
async def test_ingest_notion_meeting_notes_creates_activity_with_or_without_person(
    db_session: AsyncSession,
):
    # 1. Setup host and a known person in DB
    host_jimmy = Person(
        first_name="Jimmy",
        last_name="Pang",
        primary_email="jimmy@test.com",
    )
    person = Person(
        first_name="Nicola",
        last_name="Corda",
        primary_email="nicola.corda@emnify.com",
    )
    db_session.add_all([host_jimmy, person])
    await db_session.commit()

    # 2. Ingest 2 records: one with matching attendee email, one with empty attendees
    record_with_person = NotionMeetingNoteRecord(
        page_id="page-nicola-1",
        title="Debrief with Nicola",
        attendees="nicola.corda@emnify.com",
        content="Technical debrief with Nicola Corda",
    )
    record_unresolved = NotionMeetingNoteRecord(
        page_id="page-unresolved-2",
        title="Interview with emnify",
        attendees="",
        content="General discussion and interview notes",
    )
    req = NotionMeetingNotesIngestRequest(records=[record_with_person, record_unresolved])
    resp = await ingest_notion_meeting_notes(db_session, req)
    assert resp.queued == 2

    # 3. Verify both activities were created in the activities table
    acts = (
        (await db_session.execute(select(Activity).where(Activity.source == "notion")))
        .scalars()
        .all()
    )
    assert len(acts) == 2

    act_nicola = next(a for a in acts if a.source_id == "notion:page-nicola-1")
    assert act_nicola.person_id == person.id
    assert act_nicola.summary == "Technical debrief with Nicola Corda"

    act_unresolved = next(a for a in acts if a.source_id == "notion:page-unresolved-2")
    assert act_unresolved.person_id == host_jimmy.id
    assert act_unresolved.summary == "General discussion and interview notes"

    # 4. Test update flow: re-ingest with updated/longer content
    update_record = NotionMeetingNoteRecord(
        page_id="page-nicola-1",
        title="Debrief with Nicola (Updated)",
        attendees="nicola.corda@emnify.com",
        content="Technical debrief with Nicola Corda - Full 50k character transcript appended here...",
    )
    update_req = NotionMeetingNotesIngestRequest(records=[update_record])
    update_resp = await ingest_notion_meeting_notes(db_session, update_req)
    assert update_resp.queued == 1

    # Verify existing activity was updated
    await db_session.refresh(act_nicola)
    assert act_nicola.title == "Debrief with Nicola (Updated)"
    assert "Full 50k character transcript" in act_nicola.summary


@pytest.mark.asyncio
async def test_backfill_notion_meeting_notes_into_activities(db_session: AsyncSession):
    # Setup host Jimmy Pang, external person Yarek, company emnify
    host_jimmy = Person(first_name="Jimmy", last_name="Pang", primary_email="jimmy@test.com")
    yarek = Person(first_name="Yarek", last_name="Matacz", primary_email="yarek@test.com")
    company_emnify = Company(name="emnify", domain="emnify.com")
    company_lightdash = Company(name="Lightdash", domain="lightdash.com")
    db_session.add_all([host_jimmy, yarek, company_emnify, company_lightdash])
    await db_session.flush()

    # Link Yarek to Lightdash
    rel = PersonCompanyRelationship(person_id=yarek.id, company_id=company_lightdash.id)
    db_session.add(rel)

    # Add 4 intake notes:
    # 1. External person match (prioritizing Yarek over Jimmy in "Jimmy Pang x Yarek")
    note1 = IntakeNotionMeetingNote(
        page_id="page-yarek-1",
        title="Jimmy Pang x Yarek 2026-09-03T15:07:00.000+02:00",
        content="Sync with Yarek on business development",
    )
    # 2. Company match in title ("Interview with emnify")
    note2 = IntakeNotionMeetingNote(
        page_id="page-emnify-2",
        title="Interview with emnify 2026-09-07T15:51:00.000+02:00",
        content="Executive discussion with emnify team",
    )
    # 3. Unmatched note ("Marketing and Sales Guide") -> should fallback to host Jimmy Pang
    note3 = IntakeNotionMeetingNote(
        page_id="page-general-3",
        title="Marketing and Sales Guide",
        content="General internal notes",
    )
    # 4. Note with existing activity that needs updating
    note4 = IntakeNotionMeetingNote(
        page_id="page-existing-4",
        title="Sync Note 2026-08-20T10:00:00.000+02:00",
        content="Short summary",
    )
    db_session.add_all([note1, note2, note3, note4])
    await db_session.flush()

    # Add an existing partial activity for note4
    existing_act = Activity(
        person_id=host_jimmy.id,
        type="meeting",
        source="notion",
        source_id="notion:page-existing-4",
        occurred_at=datetime.datetime(2026, 8, 20, 10, 0, tzinfo=datetime.UTC),
        title="Old Title",
        summary="Short summary",
    )
    db_session.add(existing_act)
    await db_session.commit()

    # Run backfill
    res = await backfill_notion_meeting_notes_into_activities(db_session)
    assert res["status"] == "success"
    assert res["created_activities"] == 3
    assert res["updated_activities"] == 1

    # Verify note1 matched Yarek (external contact prioritized over Jimmy) and inherited Yarek's company
    act1 = (
        await db_session.execute(
            select(Activity).where(Activity.source_id == "notion:page-yarek-1")
        )
    ).scalar_one()
    assert act1.person_id == yarek.id
    assert act1.company_id == company_lightdash.id
    assert act1.title == "Jimmy Pang x Yarek"

    # Verify note2 matched company emnify directly from title
    act2 = (
        await db_session.execute(
            select(Activity).where(Activity.source_id == "notion:page-emnify-2")
        )
    ).scalar_one()
    assert act2.company_id == company_emnify.id
    assert act2.title == "Interview with emnify"

    # Verify note3 fallback to host Jimmy to satisfy person/company constraint
    act3 = (
        await db_session.execute(
            select(Activity).where(Activity.source_id == "notion:page-general-3")
        )
    ).scalar_one()
    assert act3.person_id == host_jimmy.id

    # Verify note4 existing activity had its title cleaned
    await db_session.refresh(existing_act)
    assert existing_act.title == "Sync Note"
