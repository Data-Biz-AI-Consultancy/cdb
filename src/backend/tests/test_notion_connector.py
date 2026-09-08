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

    assert parse_flexible_datetime(None) is None
    assert parse_flexible_datetime("") is None


def test_parse_meeting_note():
    service = NotionConnectorService(api_key="test-key")

    raw_page = {
        "id": "page-123",
        "url": "https://notion.so/page-123",
        "created_time": "2024-07-01T09:00:00Z",
        "parent": {"database_id": "db-abc"},
        "properties": {
            "Name": {
                "type": "title",
                "title": [{"plain_text": "Quarterly Strategy Sync"}],
            },
            "Date": {
                "type": "date",
                "date": {"start": "2024-07-01T10:00:00Z"},
            },
            "Attendees": {
                "type": "people",
                "people": [
                    {"name": "Alice Cooper", "person": {"email": "alice@example.com"}},
                    {"name": "Bob Smith", "person": {"email": "bob@example.com"}},
                ],
            },
            "Summary": {
                "type": "rich_text",
                "rich_text": [{"plain_text": "High-level review of Q3 milestones and pipeline."}],
            },
        },
    }

    raw_blocks = [
        {
            "type": "heading_2",
            "heading_2": {"rich_text": [{"plain_text": "Key Discussion Points"}]},
        },
        {
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"plain_text": "Reviewed enterprise ARR growth."}]},
        },
        {
            "type": "to_do",
            "to_do": {
                "checked": False,
                "rich_text": [{"plain_text": "Send updated pitch deck to Alice"}],
            },
        },
        {
            "type": "to_do",
            "to_do": {
                "checked": True,
                "rich_text": [{"plain_text": "Finalize Q3 headcount budget"}],
            },
        },
    ]

    record = service.parse_meeting_note(raw_page, blocks=raw_blocks)

    assert record.page_id == "page-123"
    assert record.title == "Quarterly Strategy Sync"
    assert record.meeting_date == datetime.datetime(2024, 7, 1, 10, 0, tzinfo=datetime.UTC)
    assert "Alice Cooper" in (record.attendees or "")
    assert "Bob Smith" in (record.attendees or "")
    assert "High-level review" in (record.summary or "")
    assert len(record.to_dos) == 2
    assert "[ ] Send updated pitch deck to Alice" in record.to_dos
    assert "[x] Finalize Q3 headcount budget" in record.to_dos
    assert record.url == "https://notion.so/page-123"


@pytest.mark.asyncio
async def test_fetch_database_pages():
    service = NotionConnectorService(api_key="secret-key")

    mock_client = AsyncMock()
    mock_resp = MagicMock(spec=Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "results": [{"id": "p1"}, {"id": "p2"}],
        "has_more": False,
        "next_cursor": None,
    }
    mock_client.post.return_value = mock_resp

    pages = await service.fetch_database_pages("3876e98d4ef8807eab9be1b0b029246c", client=mock_client)
    assert len(pages) == 2
    assert pages[0]["id"] == "p1"
    assert pages[1]["id"] == "p2"


@pytest.mark.asyncio
async def test_fetch_page_blocks():
    service = NotionConnectorService(api_key="secret-key")

    mock_client = AsyncMock()
    mock_resp = MagicMock(spec=Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "results": [
            {"type": "paragraph", "paragraph": {"rich_text": [{"plain_text": "Hello world"}]}}
        ],
        "has_more": False,
        "next_cursor": None,
    }
    mock_client.get.return_value = mock_resp

    blocks = await service.fetch_page_blocks("p1", client=mock_client)
    assert len(blocks) == 1
    assert blocks[0]["type"] == "paragraph"


@pytest.mark.asyncio
async def test_sync_from_notion_api():
    service = NotionConnectorService(
        api_key="secret-key",
        database_ids=["test-db-1"],
    )

    mock_db = AsyncMock(spec=AsyncSession)

    page_data = {
        "id": "p-1",
        "url": "https://notion.so/p-1",
        "created_time": "2024-08-01T12:00:00Z",
        "properties": {
            "Title": {"type": "title", "title": [{"plain_text": "Meeting with Client"}]},
        },
    }

    with patch.object(service, "fetch_database_pages", new_callable=AsyncMock) as mock_fetch_pages, \
         patch.object(service, "fetch_page_blocks", new_callable=AsyncMock) as mock_fetch_blocks, \
         patch("cdb.services.connectors.notion.ingest_notion_meeting_notes", new_callable=AsyncMock) as mock_ingest:

        mock_fetch_pages.return_value = [page_data]
        mock_fetch_blocks.return_value = []
        mock_ingest.return_value = MagicMock(queued=1, duplicates_skipped=0)

        result = await service.sync_from_notion_api(mock_db)

        assert result["status"] == "success"
        assert result["total_fetched"] == 1
        assert result["queued"] == 1
        assert result["duplicates_skipped"] == 0
        mock_ingest.assert_awaited_once()


@pytest.mark.asyncio
async def test_sync_unconfigured_error():
    mock_db = AsyncMock(spec=AsyncSession)

    with patch("cdb.core.config.settings.NOTION_API_KEY", None), \
         patch("cdb.core.config.settings.JAGER_DATABASE_URL", None):
        service = NotionConnectorService(api_key=None, database_ids=[])
        with pytest.raises(ValidationError, match="Neither NOTION_API_KEY nor JAGER_DATABASE_URL"):
            await service.sync(mock_db, source="auto")



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

