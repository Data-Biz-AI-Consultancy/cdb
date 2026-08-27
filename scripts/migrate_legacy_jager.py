"""
Legacy Jager to CDB Migration & Backfill Tool
Transfers historical records from Jager PostgreSQL database directly into CDB via API or direct session.
"""

import argparse
import json
import logging
import os
import sys
import httpx
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("legacy-migrator")


def migrate_linkedin_connections(jager_engine, cdb_api_url: str, api_key: str):
    logger.info("Reading legacy LinkedIn connections from s_linkedin.connections...")
    with jager_engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT id, first_name, last_name, profile_url, email_address, company, position, connected_at
                FROM s_linkedin.connections
            """)
        ).mappings().all()

    if not rows:
        logger.info("No connections found.")
        return

    logger.info(f"Found {len(rows)} connections. Sending to CDB...")
    records = []
    for r in rows:
        records.append({
            "connection_id": str(r["id"]),
            "first_name": r["first_name"],
            "last_name": r["last_name"],
            "profile_url": r["profile_url"],
            "email_address": r["email_address"],
            "company": r["company"],
            "position": r["position"],
            "connected_at": r["connected_at"].isoformat() if r["connected_at"] else None,
            "raw_payload": dict(r),
        })

    # Batch send
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        resp = httpx.post(
            f"{cdb_api_url}/api/v1/ingest/linkedin-connections",
            json={"records": batch},
            headers={"X-API-Key": api_key},
            timeout=60.0,
        )
        resp.raise_for_status()
        logger.info(f"Ingested connections batch {i + 1} to {min(i + batch_size, len(records))}")


def migrate_linkedin_messages(jager_engine, cdb_api_url: str, api_key: str):
    logger.info("Reading legacy LinkedIn messages from s_linkedin.messages...")
    with jager_engine.connect() as conn:
        conv_rows = conn.execute(
            text("""
                SELECT 
                    conversation_id,
                    COUNT(*) as msg_count,
                    MODE() WITHIN GROUP (
                        ORDER BY CASE 
                            WHEN sender_name IS NOT NULL AND sender_name != 'Jimmy Pang' THEN sender_name
                            WHEN recipient_name IS NOT NULL AND recipient_name != 'Jimmy Pang' THEN recipient_name
                            ELSE COALESCE(sender_name, recipient_name)
                        END
                    ) as counterparty_name,
                    string_agg(
                        COALESCE(sender_name, 'Unknown') || ': ' || COALESCE(content, ''), 
                        E'\n' 
                        ORDER BY sent_at ASC
                    ) as convo_transcript
                FROM s_linkedin.messages
                GROUP BY conversation_id
            """)
        ).mappings().all()

    if not conv_rows:
        logger.info("No messages found.")
        return

    logger.info(f"Found {len(conv_rows)} conversations. Sending to CDB...")
    records = []
    for r in conv_rows:
        records.append({
            "conversation_id": str(r["conversation_id"]),
            "participant_names": r["counterparty_name"],
            "message_count": r["msg_count"],
            "raw_content": r["convo_transcript"],
            "raw_payload": {"conversation_id": str(r["conversation_id"])},
        })

    resp = httpx.post(
        f"{cdb_api_url}/api/v1/ingest/linkedin-messages",
        json={"records": records},
        headers={"X-API-Key": api_key},
        timeout=60.0,
    )
    resp.raise_for_status()
    logger.info(f"Successfully ingested {len(records)} LinkedIn conversations.")


def migrate_notion_meeting_notes(jager_engine, cdb_api_url: str, api_key: str):
    logger.info("Reading Notion meeting notes from s_notion.meeting_notes...")
    with jager_engine.connect() as conn:
        table_check = conn.execute(
            text("SELECT 1 FROM information_schema.tables WHERE table_schema = 's_notion' AND table_name = 'meeting_notes'")
        ).fetchone()

        if not table_check:
            logger.info("Table s_notion.meeting_notes does not exist. Skipping.")
            return

        notes = conn.execute(
            text("""
                SELECT id, database_id, title, meeting_date, attendees, summary, transcription, action_items, url
                FROM s_notion.meeting_notes
            """)
        ).mappings().all()

    if not notes:
        logger.info("No Notion meeting notes found.")
        return

    records = []
    for n in notes:
        action_items = n.get("action_items") or ""
        to_dos = [item.strip() for item in action_items.split("\n") if item.strip()] if action_items else []
        records.append({
            "page_id": str(n["id"]),
            "database_name": n.get("database_id"),
            "title": n.get("title") or "Meeting Note",
            "meeting_date": n["meeting_date"].isoformat() if n.get("meeting_date") else None,
            "attendees": n.get("attendees"),
            "summary": n.get("summary") or n.get("transcription"),
            "to_dos": to_dos,
            "url": n.get("url"),
            "raw_payload": dict(n),
        })

    resp = httpx.post(
        f"{cdb_api_url}/api/v1/ingest/notion-meeting-notes",
        json={"records": records},
        headers={"X-API-Key": api_key},
        timeout=60.0,
    )
    resp.raise_for_status()
    logger.info(f"Successfully ingested {len(records)} Notion meeting notes.")


def main():
    parser = argparse.ArgumentParser(description="Migrate historical Jager CDP data into CDB.")
    parser.add_argument("--jager-db-url", default=os.getenv("JAGER_DATABASE_URL", "postgresql://jager:jager@localhost:5432/jager"))
    parser.add_argument("--cdb-api-url", default=os.getenv("CDB_API_URL", "http://localhost:8000"))
    parser.add_argument("--api-key", default=os.getenv("CDB_API_KEY", "cdb-service-api-key"))

    args = parser.parse_args()

    logger.info(f"Connecting to Jager DB: {args.jager_db_url}")
    jager_engine = create_engine(args.jager_db_url)

    try:
        migrate_linkedin_connections(jager_engine, args.cdb_api_url, args.api_key)
        migrate_linkedin_messages(jager_engine, args.cdb_api_url, args.api_key)
        migrate_notion_meeting_notes(jager_engine, args.cdb_api_url, args.api_key)
        logger.info("Triggering dynamic segmentation & temperature evaluation...")
        httpx.post(f"{args.cdb_api_url}/api/v1/segments/evaluate", headers={"X-API-Key": args.api_key}, timeout=60.0)
        logger.info("Migration completed successfully!")
    except Exception as e:
        logger.error(f"Migration error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
