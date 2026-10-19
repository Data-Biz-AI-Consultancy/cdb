"""Self-hosted connector config is operator-owned and empty by default."""

from unittest.mock import AsyncMock, patch

import pytest

from cdb.core.config import Settings
from cdb.services.connectors.linkedin import (
    LinkedInConnectorService,
    resolve_linkedin_owner_name,
)
from cdb.services.connectors.notion import NotionConnectorService
from cdb.workers.tasks import _sync_linkedin_direct_async, _sync_notion_direct_async


def _settings_without_dotenv(monkeypatch: pytest.MonkeyPatch) -> Settings:
    monkeypatch.delenv("NOTION_MEETING_NOTES_DATABASE_IDS", raising=False)
    monkeypatch.delenv("LINKEDIN_ACCOUNT_OWNER_NAME", raising=False)
    return Settings(_env_file=None)


def test_notion_database_ids_default_empty(monkeypatch: pytest.MonkeyPatch):
    settings = _settings_without_dotenv(monkeypatch)
    assert settings.NOTION_MEETING_NOTES_DATABASE_IDS == []
    assert settings.LINKEDIN_ACCOUNT_OWNER_NAME == ""


def test_notion_database_ids_empty_env_stays_empty(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("NOTION_MEETING_NOTES_DATABASE_IDS", "")
    settings = Settings(_env_file=None)
    assert settings.NOTION_MEETING_NOTES_DATABASE_IDS == []


def test_notion_database_ids_parse_operator_list(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("NOTION_MEETING_NOTES_DATABASE_IDS", " db-1 , db-2 ")
    settings = Settings(_env_file=None)
    assert settings.NOTION_MEETING_NOTES_DATABASE_IDS == ["db-1", "db-2"]


def test_explicit_connector_args_do_not_fall_back_to_settings():
    with (
        patch(
            "cdb.services.connectors.linkedin.settings.LINKEDIN_ACCESS_TOKEN",
            "from-env",
        ),
        patch(
            "cdb.services.connectors.notion.settings.NOTION_API_KEY",
            "from-env",
        ),
        patch(
            "cdb.services.connectors.notion.settings.NOTION_MEETING_NOTES_DATABASE_IDS",
            ["env-db"],
        ),
    ):
        linkedin = LinkedInConnectorService(access_token="")
        assert linkedin.access_token == ""
        assert LinkedInConnectorService().access_token == "from-env"

        notion = NotionConnectorService(api_key="", database_ids=[])
        assert notion.api_key == ""
        assert notion.database_ids == []
        fallback = NotionConnectorService()
        assert fallback.api_key == "from-env"
        assert fallback.database_ids == ["env-db"]


def test_blank_owner_name_is_neutral_and_does_not_read_settings():
    with patch(
        "cdb.services.connectors.linkedin_records.settings.LINKEDIN_ACCOUNT_OWNER_NAME",
        "Ada Lovelace",
    ):
        assert resolve_linkedin_owner_name(None) == "Ada Lovelace"
        assert resolve_linkedin_owner_name("") == "LinkedIn account"

        service = LinkedInConnectorService(access_token="tok")
        raw = [
            {
                "CONVERSATION ID": "c1",
                "DATE": "2023-01-10 10:00:00 UTC",
                "FROM": "Ada Lovelace",
                "TO": "Grace Hopper",
                "CONTENT": "Hello",
            }
        ]
        explicit_blank = service.parse_messages(raw, owner_name="")
        assert explicit_blank[0].participant_names == "Ada Lovelace, Grace Hopper"
        from_settings = service.parse_messages(raw)
        assert from_settings[0].participant_names == "Grace Hopper"


@pytest.mark.asyncio
async def test_linkedin_task_not_configured_skips_api():
    with (
        patch("cdb.core.config.settings.LINKEDIN_ACCESS_TOKEN", None),
        patch(
            "cdb.services.connectors.linkedin.LinkedInConnectorService.sync",
            new_callable=AsyncMock,
        ) as mock_sync,
    ):
        result = await _sync_linkedin_direct_async()
        assert result["status"] == "not_configured"
        assert result["connector"] == "linkedin"
        mock_sync.assert_not_called()


@pytest.mark.asyncio
async def test_notion_task_not_configured_skips_api():
    with (
        patch("cdb.core.config.settings.NOTION_API_KEY", "secret"),
        patch("cdb.core.config.settings.NOTION_MEETING_NOTES_DATABASE_IDS", []),
        patch("cdb.core.config.settings.JAGER_DATABASE_URL", None),
        patch(
            "cdb.services.connectors.notion.NotionConnectorService.sync",
            new_callable=AsyncMock,
        ) as mock_sync,
    ):
        api_result = await _sync_notion_direct_async(source="notion_api")
        auto_result = await _sync_notion_direct_async(source="auto")
        assert api_result["status"] == "not_configured"
        assert auto_result["status"] == "not_configured"
        mock_sync.assert_not_called()


@pytest.mark.asyncio
async def test_notion_jager_source_does_not_require_notion_credentials():
    with (
        patch("cdb.core.config.settings.NOTION_API_KEY", None),
        patch("cdb.core.config.settings.NOTION_MEETING_NOTES_DATABASE_IDS", []),
        patch("cdb.core.config.settings.JAGER_DATABASE_URL", "postgresql://jager/jager"),
        patch("cdb.workers.tasks.AsyncSessionLocal"),
        patch(
            "cdb.services.connectors.notion.NotionConnectorService.sync",
            new_callable=AsyncMock,
        ) as mock_sync,
    ):
        mock_sync.return_value = {"status": "success"}
        result = await _sync_notion_direct_async(source="jager_db")
        assert result["status"] == "success"
        mock_sync.assert_called_once()
