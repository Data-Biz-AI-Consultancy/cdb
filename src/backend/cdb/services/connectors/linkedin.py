import logging
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.config import settings
from cdb.core.errors import ValidationError
from cdb.models.intake import IntakeLinkedInConnection
from cdb.schemas.ingestion import (
    LinkedInConnectionRecord,
    LinkedInConnectionsIngestRequest,
    LinkedInMessageRecord,
    LinkedInMessagesIngestRequest,
)
from cdb.services.connectors.linkedin_records import (
    parse_changelog_records,
    parse_connection_records,
    parse_message_records,
    resolve_linkedin_owner_name,
)
from cdb.services.ingestion.ingestion import (
    ingest_linkedin_connections,
    ingest_linkedin_messages,
)

logger = logging.getLogger(__name__)


class LinkedInConnectorService:
    def __init__(
        self,
        access_token: str | None = None,
        api_base_url: str | None = None,
        version: str | None = None,
        restli_protocol_version: str | None = None,
    ) -> None:
        self.access_token = settings.LINKEDIN_ACCESS_TOKEN if access_token is None else access_token
        self.api_base_url = (api_base_url or settings.LINKEDIN_API_BASE_URL).rstrip("/")
        self.version = version or settings.LINKEDIN_VERSION
        self.restli_protocol_version = (
            restli_protocol_version or settings.LINKEDIN_RESTLI_PROTOCOL_VERSION
        )

    def _get_headers(self) -> dict[str, str]:
        if not self.access_token:
            raise ValidationError("LINKEDIN_ACCESS_TOKEN is not configured.")
        return {
            "Authorization": f"Bearer {self.access_token}",
            "X-RestLi-Protocol-Version": self.restli_protocol_version,
            "LinkedIn-Version": self.version,
            "Accept": "application/json",
        }

    async def fetch_snapshot_domain(
        self, domain: str, client: httpx.AsyncClient | None = None
    ) -> list[dict[str, Any]]:
        """
        Fetches snapshot records for a domain (e.g. 'MESSAGES' or 'CONNECTIONS')
        from the LinkedIn Member Data Portability API.
        """
        url = f"{self.api_base_url}/memberSnapshotData"
        params = {"q": "criteria", "domain": domain}
        headers = self._get_headers()

        close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=60.0)
            close_client = True

        try:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            records: list[dict[str, Any]] = []
            elements = data if isinstance(data, list) else data.get("elements", [data])
            for elem in elements:
                if not isinstance(elem, dict):
                    continue
                snapshot = elem.get("snapshotData")
                if isinstance(snapshot, list):
                    records.extend([s for s in snapshot if isinstance(s, dict)])
                elif isinstance(snapshot, dict):
                    records.append(snapshot)
                elif "snapshotData" not in elem:
                    records.append(elem)
            return records
        finally:
            if close_client:
                await client.aclose()

    def parse_messages(
        self, raw_records: list[dict[str, Any]], owner_name: str | None = None
    ) -> list[LinkedInMessageRecord]:
        """Group snapshot messages into conversation records."""
        return parse_message_records(raw_records, owner_name=owner_name)

    async def fetch_changelog_messages(
        self,
        client: httpx.AsyncClient | None = None,
        count: int = 50,
        max_pages: int = 15,
    ) -> list[dict[str, Any]]:
        """
        Fetches message events from the Member Changelog API (real-time stream, last 28 days).
        """
        url = f"{self.api_base_url}/memberChangeLogs"
        headers = self._get_headers()

        close_client = False
        if client is None:
            client = httpx.AsyncClient(timeout=60.0)
            close_client = True

        all_message_events: list[dict[str, Any]] = []
        cursor_ms: int | None = None

        try:
            for _ in range(max_pages):
                params: dict[str, Any] = {
                    "q": "memberAndApplication",
                    "count": count,
                }
                if cursor_ms is not None:
                    params["startTime"] = cursor_ms

                try:
                    resp = await client.get(url, params=params, headers=headers)
                    resp.raise_for_status()
                    data = resp.json()
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code == 429:
                        logger.warning(
                            "LinkedIn memberChangeLogs daily quota reached (HTTP 429). Falling back to snapshot."
                        )
                        break
                    raise

                elements = data.get("elements", [])
                if not elements:
                    break

                for elem in elements:
                    if elem.get("resourceName") == "messages":
                        all_message_events.append(elem)

                last_processed = elements[-1].get("processedAt")
                if (
                    not last_processed
                    or (cursor_ms is not None and last_processed <= cursor_ms)
                    or len(elements) < count
                ):
                    break
                cursor_ms = last_processed + 1

            return all_message_events
        finally:
            if close_client:
                await client.aclose()

    def parse_changelog_messages(
        self,
        raw_events: list[dict[str, Any]],
        connection_names: dict[str, str] | None = None,
        owner_name: str | None = None,
    ) -> list[LinkedInMessageRecord]:
        """Parse memberChangeLogs events into conversation records."""
        return parse_changelog_records(
            raw_events, connection_names=connection_names, owner_name=owner_name
        )

    def parse_connections(
        self, raw_records: list[dict[str, Any]]
    ) -> list[LinkedInConnectionRecord]:
        """Parse a connections snapshot into intake records."""
        return parse_connection_records(raw_records)

    async def sync(
        self,
        db: AsyncSession,
        sync_messages: bool = True,
        sync_connections: bool = True,
        owner_name: str | None = None,
    ) -> dict[str, Any]:
        """
        Directly queries the LinkedIn API and ingests records into CDB.
        Combines historical snapshot data with real-time changelog events.
        """
        if not self.access_token:
            raise ValidationError("LinkedIn access token is not configured.")

        resolved_owner = resolve_linkedin_owner_name(owner_name)
        results: dict[str, Any] = {
            "status": "success",
            "messages_fetched": 0,
            "conversations_ingested": 0,
            "connections_fetched": 0,
            "connections_ingested": 0,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            # 1. Sync Messages (INBOX snapshot + Changelog live stream)
            if sync_messages:
                logger.info("Directly fetching LinkedIn messages from Member Portability API...")
                raw_messages = await self.fetch_snapshot_domain("INBOX", client=client)
                changelog_events = await self.fetch_changelog_messages(client=client)

                # Preload connection names for participant resolution
                conn_names: dict[str, str] = {}
                try:
                    conn_rows = (
                        await db.execute(
                            select(
                                IntakeLinkedInConnection.first_name,
                                IntakeLinkedInConnection.last_name,
                            )
                        )
                    ).all()
                    for fn, ln in conn_rows:
                        if fn:
                            full = f"{fn.strip()} {ln.strip()}" if ln else fn.strip()
                            conn_names.setdefault(fn.strip().lower(), full)
                except Exception as ex:
                    logger.warning("Could not query connection names for resolution: %s", ex)

                snapshot_records = self.parse_messages(raw_messages, owner_name=resolved_owner)
                changelog_records = self.parse_changelog_messages(
                    changelog_events, connection_names=conn_names, owner_name=resolved_owner
                )

                # Merge snapshot and changelog conversations
                merged: dict[str, LinkedInMessageRecord] = {
                    r.conversation_id: r for r in snapshot_records
                }
                for cr in changelog_records:
                    if cr.conversation_id in merged:
                        existing = merged[cr.conversation_id]
                        combined_content = (
                            (existing.raw_content or "") + "\n" + (cr.raw_content or "")
                        )
                        latest_sent = max(
                            [
                                dt
                                for dt in [existing.last_sent_at, cr.last_sent_at]
                                if dt is not None
                            ]
                        )
                        earliest_sent = min(
                            [
                                dt
                                for dt in [existing.first_sent_at, cr.first_sent_at]
                                if dt is not None
                            ]
                        )
                        p_name = (
                            cr.participant_names
                            if cr.participant_names != "LinkedIn Member"
                            else existing.participant_names
                        )
                        merged[cr.conversation_id] = LinkedInMessageRecord(
                            conversation_id=cr.conversation_id,
                            participant_names=p_name or existing.participant_names,
                            message_count=existing.message_count + cr.message_count,
                            raw_content=combined_content.strip(),
                            last_sent_at=latest_sent,
                            first_sent_at=earliest_sent,
                            raw_payload={
                                "conversation_id": cr.conversation_id,
                                "last_sent_at": latest_sent.isoformat() if latest_sent else None,
                                "first_sent_at": earliest_sent.isoformat()
                                if earliest_sent
                                else None,
                                "message_count": existing.message_count + cr.message_count,
                                "has_changelog": True,
                            },
                        )
                    else:
                        merged[cr.conversation_id] = cr

                all_messages = list(merged.values())
                results["messages_fetched"] = len(raw_messages) + len(changelog_events)
                if all_messages:
                    msg_resp = await ingest_linkedin_messages(
                        db, LinkedInMessagesIngestRequest(records=all_messages)
                    )
                    results["conversations_ingested"] = msg_resp.queued
                    results["conversations_skipped"] = msg_resp.duplicates_skipped

            # 2. Sync Connections
            if sync_connections:
                logger.info("Directly fetching LinkedIn connections from Member Portability API...")
                raw_conns = await self.fetch_snapshot_domain("CONNECTIONS", client=client)
                results["connections_fetched"] = len(raw_conns)
                parsed_conns = self.parse_connections(raw_conns)
                if parsed_conns:
                    conn_resp = await ingest_linkedin_connections(
                        db, LinkedInConnectionsIngestRequest(records=parsed_conns)
                    )
                    results["connections_ingested"] = conn_resp.queued
                    results["connections_skipped"] = conn_resp.duplicates_skipped

        return results
