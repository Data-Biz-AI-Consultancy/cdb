import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import ValidationError
from cdb.services.connectors.notion import (
    NotionConnectorService,
    format_uuid,
    parse_flexible_datetime,
)
from cdb.workers.tasks import (
    _sync_notion_direct_async,
    sync_notion_direct_background,
)


def test_format_uuid():
    raw_32 = "3876e98d4ef8807eab9be1b0b029246c"
    formatted = format_uuid(raw_32)
    assert formatted == "3876e98d-4ef8-807e-ab9b-e1b0b029246c"

    # Already formatted
    assert format_uuid("3876e98d-4ef8-807e-ab9b-e1b0b029246c") == "3876e98d-4ef8-807e-ab9b-e1b0b029246c"
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
            "Last edited time": {"type": "last_edited_time", "last_edited_time": "2024-07-01T09:30:00Z"},
        },
    }

    raw_blocks = [
        {
            "type": "heading_1",
            "heading_1": {"rich_text": [{"plain_text": "Meeting Objectives"}]},
        },
        {
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"plain_text": "Discuss architecture refactoring"}]},
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
    assert "Detailed strategic alignment" in (record.summary or "")
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

    with patch.object(service, "fetch_database_pages", new_callable=AsyncMock) as mock_fetch, \
         patch.object(service, "fetch_page_blocks", new_callable=AsyncMock) as mock_blocks, \
         patch("cdb.services.connectors.notion.ingest_notion_meeting_notes", new_callable=AsyncMock) as mock_ingest:

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

    with patch("sqlalchemy.create_engine", return_value=mock_engine), \
         patch("cdb.services.connectors.notion.ingest_notion_meeting_notes", new_callable=AsyncMock) as mock_ingest:
        mock_ingest.return_value = MagicMock(queued=1, duplicates_skipped=0)

        result = await service.sync_from_jager_db(mock_db, jager_db_url="postgresql://test:test@localhost:5432/jager")
        assert result["status"] == "success"
        assert result["total_fetched"] == 1
        assert result["queued"] == 1


@pytest.mark.asyncio
async def test_sync_modes_routing():
    service = NotionConnectorService(api_key="secret-key")
    mock_db = AsyncMock(spec=AsyncSession)

    with patch.object(service, "sync_from_notion_api", new_callable=AsyncMock) as mock_api_sync, \
         patch.object(service, "sync_from_jager_db", new_callable=AsyncMock) as mock_db_sync:

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

    with patch("cdb.core.config.settings.NOTION_API_KEY", None), \
         patch("cdb.core.config.settings.JAGER_DATABASE_URL", None):
        service = NotionConnectorService(api_key=None, database_ids=[])
        with pytest.raises(ValidationError, match="Neither NOTION_API_KEY nor JAGER_DATABASE_URL"):
            await service.sync(mock_db, source="auto")


@pytest.mark.asyncio
async def test_celery_task_async_worker():
    # Test _sync_notion_direct_async
    with patch("cdb.workers.tasks.AsyncSessionLocal"), \
         patch("cdb.services.connectors.notion.NotionConnectorService.sync", new_callable=AsyncMock) as mock_sync:
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
    with patch("cdb.api.v1.connectors.NotionConnectorService.sync", new_callable=AsyncMock) as mock_sync:
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
    with patch("cdb.workers.tasks.sync_notion_direct_background.delay", side_effect=Exception("Redis down")), \
         patch("cdb.api.v1.connectors.NotionConnectorService.sync", new_callable=AsyncMock) as mock_fallback_sync:
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
    chunk = "Speaker 1: Explaining system architecture and end-to-end data pipeline requirements.\n" * 15000  # ~1.25M chars
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
                    "paragraph": {"rich_text": [{"plain_text": "Final concluding remarks after 4 hours."}]},
                }
            ],
        }
    ]

    record = service.parse_meeting_note(raw_page, blocks=raw_blocks)
    assert record.summary is not None
    assert len(record.summary) > 1_000_000
    assert "Final concluding remarks after 4 hours." in record.summary
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
    assert blocks[0]["children"][0]["paragraph"]["rich_text"][0]["plain_text"] == "Child transcription inside quote"

