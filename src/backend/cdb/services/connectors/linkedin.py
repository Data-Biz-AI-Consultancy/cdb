import datetime
import logging
import re
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.config import settings
from cdb.core.errors import ValidationError
from cdb.schemas.ingestion import (
    LinkedInConnectionRecord,
    LinkedInConnectionsIngestRequest,
    LinkedInMessageRecord,
    LinkedInMessagesIngestRequest,
)
from cdb.services.ingestion.ingestion import (
    ingest_linkedin_connections,
    ingest_linkedin_messages,
)

logger = logging.getLogger(__name__)


def parse_flexible_datetime(dt_str: str | None) -> datetime.datetime | None:
    """Parses various date and datetime formats commonly returned by LinkedIn APIs."""
    if not dt_str:
        return None
    cleaned = dt_str.strip()
    # Try ISO format
    try:
        return datetime.datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
    except Exception:
        pass

    # Try common formats like "2024-05-14 15:30:00 UTC" or "2024-05-14 15:30:00"
    for fmt in (
        "%Y-%m-%d %H:%M:%S %Z",
        "%Y-%m-%d %H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%b %d, %Y, %I:%M %p",
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
    ):
        try:
            # Handle UTC suffix
            target = cleaned.replace(" UTC", "").strip() if "%Z" not in fmt else cleaned
            parsed = datetime.datetime.strptime(target, fmt)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=datetime.UTC)
            return parsed
        except Exception:
            continue
    return None


class LinkedInConnectorService:
    def __init__(
        self,
        access_token: str | None = None,
        api_base_url: str | None = None,
        version: str | None = None,
        restli_protocol_version: str | None = None,
    ) -> None:
        self.access_token = access_token or settings.LINKEDIN_ACCESS_TOKEN
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
        self, raw_records: list[dict[str, Any]], owner_name: str = "Jimmy Pang"
    ) -> list[LinkedInMessageRecord]:
        """
        Groups raw LinkedIn messages by conversation_id, extracts timestamps,
        constructs the chronological transcript, and populates last_sent_at.
        """
        conversations: dict[str, list[dict[str, Any]]] = {}

        for msg in raw_records:
            convo_id = (
                msg.get("CONVERSATION ID")
                or msg.get("conversation_id")
                or msg.get("conversationId")
                or ""
            ).strip()
            if not convo_id:
                continue

            date_str = msg.get("DATE") or msg.get("date") or msg.get("sent_at") or ""
            parsed_dt = parse_flexible_datetime(str(date_str)) or datetime.datetime.now(
                datetime.UTC
            )

            sender = (msg.get("FROM") or msg.get("sender_name") or "").strip()
            recipient = (msg.get("TO") or msg.get("recipient_name") or "").strip()
            content = (msg.get("CONTENT") or msg.get("content") or "").strip()
            sender_url = (msg.get("SENDER PROFILE URL") or msg.get("sender_profile_url") or "").strip()
            recipient_urls = (
                msg.get("RECIPIENT PROFILE URLS") or msg.get("recipient_profile_urls") or ""
            ).strip()

            conversations.setdefault(convo_id, []).append(
                {
                    "sent_at": parsed_dt,
                    "sender_name": sender,
                    "recipient_name": recipient,
                    "content": content,
                    "sender_profile_url": sender_url,
                    "recipient_profile_urls": recipient_urls,
                    "subject": msg.get("SUBJECT") or msg.get("subject") or "",
                    "folder": msg.get("FOLDER") or msg.get("folder") or "",
                    "raw": msg,
                }
            )

        records: list[LinkedInMessageRecord] = []
        for convo_id, msgs in conversations.items():
            # Sort messages chronologically
            msgs.sort(key=lambda m: m["sent_at"])

            earliest_dt = msgs[0]["sent_at"]
            latest_dt = msgs[-1]["sent_at"]

            # Determine participant names (exclude owner name)
            participants: list[str] = []
            for m in msgs:
                s = m["sender_name"]
                r = m["recipient_name"]
                if s and owner_name.lower() not in s.lower() and s not in participants:
                    participants.append(s)
                if r and owner_name.lower() not in r.lower() and r not in participants:
                    participants.append(r)

            if not participants and msgs:
                # Fallback to any sender or recipient
                first_msg = msgs[0]
                fallback = first_msg["sender_name"] or first_msg["recipient_name"] or "Contact"
                participants.append(fallback)

            participant_names_str = ", ".join(participants)

            # Build transcript
            transcript_lines = [
                f"{m['sender_name'] or 'Unknown'}: {m['content']}" for m in msgs if m["content"]
            ]
            raw_content = "\n".join(transcript_lines)

            records.append(
                LinkedInMessageRecord(
                    conversation_id=convo_id,
                    participant_names=participant_names_str,
                    message_count=len(msgs),
                    raw_content=raw_content,
                    last_sent_at=latest_dt,
                    first_sent_at=earliest_dt,
                    raw_payload={
                        "conversation_id": convo_id,
                        "last_sent_at": latest_dt.isoformat(),
                        "first_sent_at": earliest_dt.isoformat(),
                        "message_count": len(msgs),
                    },
                )
            )

        return records

    def parse_connections(
        self, raw_records: list[dict[str, Any]]
    ) -> list[LinkedInConnectionRecord]:
        """
        Parses LinkedIn connections snapshot into LinkedInConnectionRecord list.
        """
        records: list[LinkedInConnectionRecord] = []
        for conn in raw_records:
            first_name = (conn.get("First Name") or conn.get("first_name") or "").strip()
            last_name = (conn.get("Last Name") or conn.get("last_name") or "").strip()
            company = (conn.get("Company") or conn.get("company") or "").strip()
            position = (conn.get("Position") or conn.get("position") or "").strip()
            email = (conn.get("Email Address") or conn.get("email_address") or "").strip()
            url = (conn.get("URL") or conn.get("profile_url") or "").strip()

            connected_on_str = (
                conn.get("Connected On") or conn.get("connected_at") or conn.get("connected_on") or ""
            )
            connected_at = parse_flexible_datetime(str(connected_on_str))

            slug = "contact"
            if url and "/in/" in url:
                slug = url.split("/in/")[1].split("/")[0].split("?")[0]
            elif email:
                slug = re.sub(r"[^a-zA-Z0-9]", "_", email.lower())
            elif first_name or last_name:
                slug = re.sub(r"[^a-zA-Z0-9]", "_", f"{first_name}_{last_name}".lower())

            conn_time_suffix = (
                connected_at.strftime("%Y%m%d%H%M%S") if connected_at else "unknown"
            )
            connection_id = f"li_conn_{slug}_{conn_time_suffix}"

            records.append(
                LinkedInConnectionRecord(
                    connection_id=connection_id,
                    first_name=first_name or None,
                    last_name=last_name or None,
                    company=company or None,
                    position=position or None,
                    email_address=email or None,
                    profile_url=url or None,
                    connected_at=connected_at,
                    raw_payload=conn,
                )
            )
        return records

    async def sync(
        self,
        db: AsyncSession,
        sync_messages: bool = True,
        sync_connections: bool = True,
    ) -> dict[str, Any]:
        """
        Directly queries the LinkedIn API and ingests records into CDB.
        """
        if not self.access_token:
            raise ValidationError("LinkedIn access token is not configured.")

        results: dict[str, Any] = {
            "status": "success",
            "messages_fetched": 0,
            "conversations_ingested": 0,
            "connections_fetched": 0,
            "connections_ingested": 0,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            # 1. Sync Messages (INBOX)
            if sync_messages:
                logger.info("Directly fetching LinkedIn messages from Member Portability API...")
                raw_messages = await self.fetch_snapshot_domain("INBOX", client=client)
                results["messages_fetched"] = len(raw_messages)
                parsed_messages = self.parse_messages(raw_messages)
                if parsed_messages:
                    msg_resp = await ingest_linkedin_messages(
                        db, LinkedInMessagesIngestRequest(records=parsed_messages)
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
