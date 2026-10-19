"""Parse LinkedIn export rows into intake records."""

import datetime
import re
from typing import Any

from cdb.core.config import settings
from cdb.schemas.ingestion import LinkedInConnectionRecord, LinkedInMessageRecord

NEUTRAL_LINKEDIN_OWNER_NAME = "LinkedIn account"


def resolve_linkedin_owner_name(owner_name: str | None = None) -> str:
    """Use the given owner label, or settings when omitted. Blank becomes a neutral label."""
    if owner_name is None:
        owner_name = settings.LINKEDIN_ACCOUNT_OWNER_NAME
    cleaned = (owner_name or "").strip()
    return cleaned or NEUTRAL_LINKEDIN_OWNER_NAME


def _owner_name_tokens(owner_name: str) -> set[str]:
    """Tokens used to skip the account owner when inferring the other participant."""
    if owner_name.strip().lower() == NEUTRAL_LINKEDIN_OWNER_NAME.lower():
        return set()
    return {part.lower() for part in re.split(r"\s+", owner_name.strip()) if part}


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


def parse_message_records(
    raw_records: list[dict[str, Any]], owner_name: str | None = None
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
        parsed_dt = parse_flexible_datetime(str(date_str)) or datetime.datetime.now(datetime.UTC)

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

    resolved_owner = resolve_linkedin_owner_name(owner_name)
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
            if s and resolved_owner.lower() not in s.lower() and s not in participants:
                participants.append(s)
            if r and resolved_owner.lower() not in r.lower() and r not in participants:
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


def parse_changelog_records(
    raw_events: list[dict[str, Any]],
    connection_names: dict[str, str] | None = None,
    owner_name: str | None = None,
) -> list[LinkedInMessageRecord]:
    """
    Parses live message events from memberChangeLogs, grouping by thread URN,
    inferring participant names, and establishing accurate message timestamps.
    """
    conn_map = connection_names or {}
    resolved_owner = resolve_linkedin_owner_name(owner_name)
    threads: dict[str, list[dict[str, Any]]] = {}

    for elem in raw_events:
        act = elem.get("activity", {})
        thread_urn = act.get("thread", "") or elem.get("resourceId", "")
        convo_id = thread_urn.split(":")[-1] if ":" in thread_urn else thread_urn
        convo_id = convo_id.strip()
        if not convo_id:
            continue

        deliv_ms = act.get("deliveredAt") or act.get("createdAt") or elem.get("processedAt")
        if deliv_ms:
            sent_at = datetime.datetime.fromtimestamp(deliv_ms / 1000, tz=datetime.UTC)
        else:
            sent_at = datetime.datetime.now(datetime.UTC)

        content = (
            act.get("content", {}).get("fallback")
            or act.get("content", {}).get("content", {}).get("string")
            or ""
        ).strip()

        author = act.get("author") or act.get("actor") or ""
        owner_urn = elem.get("owner") or "Cq7E0YsGks"
        is_owner = (owner_urn in author) or ("Cq7E0YsGks" in author)
        sender = resolved_owner if is_owner else "Contact"

        threads.setdefault(convo_id, []).append(
            {
                "sent_at": sent_at,
                "sender_name": sender,
                "content": content,
                "is_owner": is_owner,
                "raw": elem,
            }
        )

    records: list[LinkedInMessageRecord] = []
    for convo_id, msgs in threads.items():
        msgs.sort(key=lambda m: m["sent_at"])
        earliest_dt = msgs[0]["sent_at"]
        latest_dt = msgs[-1]["sent_at"]

        all_text = "\n".join([m["content"] for m in msgs if m["content"]])
        inferred_name = infer_participant_name(all_text, conn_map, resolved_owner)

        transcript_lines = [f"{m['sender_name']}: {m['content']}" for m in msgs if m["content"]]
        raw_content = "\n".join(transcript_lines)

        records.append(
            LinkedInMessageRecord(
                conversation_id=convo_id,
                participant_names=inferred_name,
                message_count=len(msgs),
                raw_content=raw_content,
                last_sent_at=latest_dt,
                first_sent_at=earliest_dt,
                raw_payload={
                    "conversation_id": convo_id,
                    "last_sent_at": latest_dt.isoformat(),
                    "first_sent_at": earliest_dt.isoformat(),
                    "message_count": len(msgs),
                    "source": "memberChangeLogs",
                },
            )
        )
    return records


def infer_participant_name(text: str, conn_map: dict[str, str], owner_name: str) -> str:
    """Infers contact name from greeting, intro, signoff, and matches against known connections."""
    owner_tokens = _owner_name_tokens(owner_name)
    generic_stops = {"there", "all", "everyone", "team", "good"}

    def _is_owner_label(name: str) -> bool:
        lowered = name.lower()
        return bool(owner_tokens) and any(token in lowered for token in owner_tokens)

    # 1. Introduction: 'my name is X'
    m_intro = re.search(r"\bmy name is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", text, re.IGNORECASE)
    if m_intro and not _is_owner_label(m_intro.group(1)):
        cand = m_intro.group(1).split()[0].lower()
        return conn_map.get(cand, m_intro.group(1).title())

    # 2. Greeting in text: 'hi Rose', 'hey Emily'
    for m in re.finditer(r"\b(?:hi|hey|hello|dear)\s+([A-Z][a-z]+)", text, re.IGNORECASE):
        cand = m.group(1)
        if cand.lower() not in generic_stops and cand.lower() not in owner_tokens:
            return conn_map.get(cand.lower(), cand.title())

    # 3. Signoff: 'Best regards,\nAngela' or 'Br,\nprasad'
    m_sign = re.search(
        r"(?:regards|cheers|br|warm regards|best),?\s*\n+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        text,
        re.IGNORECASE,
    )
    if m_sign and not _is_owner_label(m_sign.group(1)):
        cand = m_sign.group(1).split()[0].lower()
        return conn_map.get(cand, m_sign.group(1).title())

    return "LinkedIn Member"


def parse_connection_records(raw_records: list[dict[str, Any]]) -> list[LinkedInConnectionRecord]:
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

        conn_time_suffix = connected_at.strftime("%Y%m%d%H%M%S") if connected_at else "unknown"
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
