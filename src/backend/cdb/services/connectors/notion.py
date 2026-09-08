import datetime
import logging
import re
from typing import Any

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.config import settings
from cdb.core.errors import ValidationError
from cdb.schemas.ingestion import (
    NotionMeetingNoteRecord,
    NotionMeetingNotesIngestRequest,
)
from cdb.services.ingestion.ingestion import ingest_notion_meeting_notes

logger = logging.getLogger(__name__)


def format_uuid(raw_id: str) -> str:
    """Formats 32-character string to hyphenated UUID format expected by Notion API."""
    if not raw_id:
        return ""
    cleaned = raw_id.replace("-", "").strip()
    if len(cleaned) == 32:
        return f"{cleaned[:8]}-{cleaned[8:12]}-{cleaned[12:16]}-{cleaned[16:20]}-{cleaned[20:]}"
    return raw_id


def parse_flexible_datetime(dt_str: str | None) -> datetime.datetime | None:
    """Parses ISO and common date formats."""
    if not dt_str:
        return None
    cleaned = dt_str.strip()
    try:
        return datetime.datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
    except Exception:
        pass
    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
    ):
        try:
            parsed = datetime.datetime.strptime(cleaned, fmt)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=datetime.UTC)
            return parsed
        except Exception:
            continue
    return None


class NotionConnectorService:
    def __init__(
        self,
        api_key: str | None = None,
        api_base_url: str | None = None,
        version: str | None = None,
        database_ids: list[str] | None = None,
    ) -> None:
        self.api_key = api_key or settings.NOTION_API_KEY
        self.api_base_url = (api_base_url or settings.NOTION_API_BASE_URL).rstrip("/")
        self.version = version or settings.NOTION_VERSION
        self.database_ids = (
            database_ids
            if database_ids is not None
            else list(settings.NOTION_MEETING_NOTES_DATABASE_IDS)
        )

    def _get_headers(self) -> dict[str, str]:
        if not self.api_key:
            raise ValidationError("NOTION_API_KEY is not configured.")
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Notion-Version": self.version,
            "Content-Type": "application/json",
        }

    async def fetch_database_pages(
        self,
        database_id: str,
        client: httpx.AsyncClient | None = None,
        filter_criteria: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Queries all pages in a Notion database using pagination.
        """
        formatted_id = format_uuid(database_id)
        url = f"{self.api_base_url}/databases/{formatted_id}/query"
        headers = self._get_headers()

        close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=60.0)
            close_client = True

        pages: list[dict[str, Any]] = []
        has_more = True
        start_cursor: str | None = None

        try:
            while has_more:
                payload: dict[str, Any] = {"page_size": 100}
                if start_cursor:
                    payload["start_cursor"] = start_cursor
                if filter_criteria:
                    payload["filter"] = filter_criteria

                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()

                results = data.get("results", [])
                pages.extend(results)

                has_more = data.get("has_more", False)
                start_cursor = data.get("next_cursor")
                if not start_cursor:
                    break

            return pages
        finally:
            if close_client:
                await client.aclose()

    async def fetch_page_blocks(
        self,
        page_id: str,
        client: httpx.AsyncClient | None = None,
    ) -> list[dict[str, Any]]:
        """
        Fetches child blocks for a given page using pagination.
        """
        formatted_id = format_uuid(page_id)
        url = f"{self.api_base_url}/blocks/{formatted_id}/children"
        headers = self._get_headers()

        close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=60.0)
            close_client = True

        blocks: list[dict[str, Any]] = []
        has_more = True
        start_cursor: str | None = None

        try:
            while has_more:
                params: dict[str, Any] = {"page_size": 100}
                if start_cursor:
                    params["start_cursor"] = start_cursor

                resp = await client.get(url, params=params, headers=headers)
                if resp.status_code != 200:
                    logger.warning("Failed to fetch blocks for page %s: status %d", page_id, resp.status_code)
                    break

                data = resp.json()
                results = data.get("results", [])
                blocks.extend(results)

                has_more = data.get("has_more", False)
                start_cursor = data.get("next_cursor")
                if not start_cursor:
                    break

            return blocks
        finally:
            if close_client:
                await client.aclose()

    def parse_meeting_note(
        self,
        page: dict[str, Any],
        blocks: list[dict[str, Any]] | None = None,
    ) -> NotionMeetingNoteRecord:
        """
        Extracts structured meeting note data from Notion page properties and child blocks.
        """
        page_id = page.get("id", "")
        props = page.get("properties", {}) or {}
        parent_db = (
            page.get("parent", {}).get("database_id", "")
            or page.get("database_id", "")
        )

        meeting_date_str = None
        attendees = ""
        summary = ""
        action_items = ""
        parsed_props: dict[str, Any] = {}

        for key, prop in props.items():
            if not prop or not isinstance(prop, dict):
                continue
            ptype = prop.get("type")
            val = None
            if ptype == "title":
                title_parts = []
                for t in prop.get("title", []):
                    title_parts.append(t.get("plain_text", ""))
                    if t.get("type") == "mention" and t.get("mention", {}).get("type") == "date":
                        d = t.get("mention", {}).get("date", {}).get("start")
                        if d and not meeting_date_str:
                            meeting_date_str = d
                title = "".join(title_parts)
                val = title
            elif ptype == "rich_text":
                val = "".join([t.get("plain_text", "") for t in prop.get("rich_text", [])])
            elif ptype in ("created_time", "last_edited_time"):
                val = prop.get(ptype)
            elif ptype == "number":
                val = prop.get("number")
            elif ptype == "select":
                val = prop.get("select", {}).get("name") if prop.get("select") else None
            elif ptype == "multi_select":
                val = ", ".join([s.get("name", "") for s in prop.get("multi_select", [])])
            elif ptype == "date":
                val = prop.get("date", {}).get("start") if prop.get("date") else None
            elif ptype == "checkbox":
                val = prop.get("checkbox")
            elif ptype == "url":
                val = prop.get("url")
            elif ptype == "email":
                val = prop.get("email")
            elif ptype == "people":
                val = ", ".join(
                    [
                        p.get("name") or p.get("person", {}).get("email") or p.get("id", "")
                        for p in prop.get("people", [])
                    ]
                )
            parsed_props[key] = val

        if not title:
            title = page.get("title") or page.get("name") or "Untitled Meeting Note"

        # Block content extraction (transcription, summaries, to-dos)
        text_content = ""
        to_dos: list[str] = []

        if blocks:
            for b in blocks:
                btype = b.get("type", "")
                bcontent = b.get(btype, {})
                if not isinstance(bcontent, dict):
                    continue

                btext = ""
                if "rich_text" in bcontent:
                    btext = "".join(
                        [t.get("plain_text", "") for t in bcontent.get("rich_text", [])]
                    )

                if btype == "to_do":
                    checked_prefix = "[x] " if bcontent.get("checked") else "[ ] "
                    todo_str = checked_prefix + btext
                    to_dos.append(todo_str)
                    text_content += todo_str + "\n"
                elif btext:
                    if btype.startswith("heading_"):
                        text_content += f"\n### {btext}\n"
                    elif btype == "bulleted_list_item":
                        text_content += f"* {btext}\n"
                    elif btype == "numbered_list_item":
                        text_content += f"1. {btext}\n"
                    elif btype == "quote":
                        text_content += f"> {btext}\n"
                    elif btype == "callout":
                        text_content += f"💡 {btext}\n"
                    else:
                        text_content += btext + "\n"

        # Extract meeting fields from parsed properties
        for k, val in parsed_props.items():
            if not val:
                continue
            lk = k.lower()
            if "date" in lk and not meeting_date_str:
                meeting_date_str = str(val)
            elif any(t in lk for t in ["attendee", "participant", "who", "people", "invited"]) and not attendees:
                attendees = str(val)
            elif any(t in lk for t in ["summary", "tldr", "overview", "notes"]) and not summary:
                summary = str(val)
            elif any(t in lk for t in ["action", "task", "next step", "todo"]) and not action_items:
                action_items = str(val)

        if not meeting_date_str and title:
            # Check for embedded ISO timestamp or date in title (e.g. "Interview with emnify 2026-09-07T15:51:00.000+02:00")
            match = re.search(r"(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[+-]\d{2}:?\d{2}|Z)?)?)", title)
            if match:
                meeting_date_str = match.group(1)

        created_time = page.get("created_time")
        final_date_str = meeting_date_str or created_time
        meeting_dt = parse_flexible_datetime(final_date_str) or datetime.datetime.now(datetime.UTC)


        if not summary and text_content.strip():
            summary = text_content[:1000]

        if not to_dos and action_items:
            to_dos = [item.strip() for item in action_items.split("\n") if item.strip()]

        return NotionMeetingNoteRecord(
            page_id=page_id,
            database_name=parent_db or "Notion Database",
            title=title,
            meeting_date=meeting_dt,
            attendees=attendees or None,
            summary=summary or None,
            to_dos=to_dos,
            url=page.get("url"),
            raw_payload={
                "page": page,
                "parsed_props": parsed_props,
                "blocks_count": len(blocks or []),
            },
        )

    async def sync_from_notion_api(
        self,
        db: AsyncSession,
        database_ids: list[str] | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> dict[str, Any]:
        """
        Connects directly to Notion REST API, fetches meeting note pages and blocks,
        and ingests them into CDB via ingest_notion_meeting_notes.
        """
        target_dbs = database_ids if database_ids is not None else self.database_ids
        if not target_dbs:
            raise ValidationError("No Notion database IDs configured for synchronization.")

        close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=60.0)
            close_client = True

        total_fetched = 0
        records: list[NotionMeetingNoteRecord] = []

        try:
            for db_id in target_dbs:
                pages = await self.fetch_database_pages(db_id, client=client)
                total_fetched += len(pages)
                for page in pages:
                    page_id = page.get("id")
                    blocks: list[dict[str, Any]] = []
                    if page_id:
                        blocks = await self.fetch_page_blocks(page_id, client=client)
                    record = self.parse_meeting_note(page, blocks=blocks)
                    records.append(record)

            if not records:
                return {
                    "status": "success",
                    "total_fetched": 0,
                    "queued": 0,
                    "duplicates_skipped": 0,
                    "message": "No Notion meeting notes found in configured databases.",
                }

            ingest_req = NotionMeetingNotesIngestRequest(records=records)
            res = await ingest_notion_meeting_notes(db, ingest_req)
            return {
                "status": "success",
                "total_fetched": total_fetched,
                "queued": res.queued,
                "duplicates_skipped": res.duplicates_skipped,
            }
        finally:
            if close_client:
                await client.aclose()

    async def sync_from_jager_db(
        self,
        db: AsyncSession,
        jager_db_url: str | None = None,
    ) -> dict[str, Any]:
        """
        Fallback / transition synchronizer that reads directly from Jager PostgreSQL
        (s_notion.meeting_notes table) and ingests into CDB.
        """
        from sqlalchemy import create_engine

        target_url = jager_db_url or settings.JAGER_DATABASE_URL
        if not target_url:
            raise ValidationError("JAGER_DATABASE_URL is not configured for database pull.")

        sync_engine = create_engine(target_url)
        with sync_engine.connect() as conn:
            notes = conn.execute(
                text("""
                    SELECT
                        id::text AS page_id,
                        database_id AS database_name,
                        title,
                        COALESCE(meeting_date, created_time) AS meeting_date,
                        attendees,
                        COALESCE(transcription, summary, '') AS summary,
                        action_items,
                        url
                    FROM s_notion.meeting_notes
                """)
            ).mappings().all()

        records: list[NotionMeetingNoteRecord] = []
        for n in notes:
            action_items = n.get("action_items") or ""
            to_dos = (
                [item.strip() for item in action_items.split("\n") if item.strip()]
                if action_items
                else []
            )

            meeting_dt = n.get("meeting_date")
            if isinstance(meeting_dt, str):
                meeting_dt = parse_flexible_datetime(meeting_dt)

            records.append(
                NotionMeetingNoteRecord(
                    page_id=str(n["page_id"]),
                    database_name=n.get("database_name"),
                    title=n.get("title") or "Meeting Note",
                    meeting_date=meeting_dt,
                    attendees=n.get("attendees"),
                    summary=n.get("summary"),
                    to_dos=to_dos,
                    url=n.get("url"),
                    raw_payload=dict(n),
                )
            )

        if not records:
            return {
                "status": "success",
                "total_fetched": 0,
                "queued": 0,
                "duplicates_skipped": 0,
                "message": "No Notion meeting notes found in Jager database.",
            }

        ingest_req = NotionMeetingNotesIngestRequest(records=records)
        res = await ingest_notion_meeting_notes(db, ingest_req)
        return {
            "status": "success",
            "total_fetched": len(records),
            "queued": res.queued,
            "duplicates_skipped": res.duplicates_skipped,
        }

    async def sync(
        self,
        db: AsyncSession,
        source: str = "auto",
        database_ids: list[str] | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> dict[str, Any]:
        """
        Unified sync entrypoint.
        - 'auto': Attempts Notion REST API if NOTION_API_KEY set; otherwise falls back to Jager DB.
        - 'notion_api': Forces direct Notion REST API sync.
        - 'jager_db': Forces direct Jager DB sync.
        """
        if source == "notion_api":
            return await self.sync_from_notion_api(db, database_ids=database_ids, client=client)
        elif source == "jager_db":
            return await self.sync_from_jager_db(db)

        # source == 'auto'
        if self.api_key:
            return await self.sync_from_notion_api(db, database_ids=database_ids, client=client)
        elif settings.JAGER_DATABASE_URL:
            return await self.sync_from_jager_db(db)
        else:
            raise ValidationError(
                "Neither NOTION_API_KEY nor JAGER_DATABASE_URL is configured for Notion sync."
            )
