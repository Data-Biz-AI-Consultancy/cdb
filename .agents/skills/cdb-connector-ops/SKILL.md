---
name: cdb-connector-ops
description: >-
  Use this skill for operational management, configuration, and debugging of CDB's native
  data connectors (Direct LinkedIn Connector and Direct Notion Connector), including environment
  variables, Celery Beat sync schedules, on-demand trigger endpoints, and Jager DB fallback modes.
---

# CDB Native Connectors Operations Guide

CDB includes native background connectors to synchronize external platform data directly without requiring intermediate orchestration tools.

---

## 1. Direct LinkedIn Connector

Syncs connections, profile URLs, and 28-day message interaction histories via LinkedIn's Member Portability API.

### Configuration (`.env`)
```env
LINKEDIN_ACCESS_TOKEN=AQX...
LINKEDIN_SYNC_HOURS_INTERVAL=6   # Celery Beat interval in hours (default: 6)
```

### Endpoints
- **Status Probe**: `GET /api/v1/connectors/linkedin/status`
- **Trigger Sync**:
  ```bash
  # Synchronous run
  curl -X POST "http://localhost:8000/api/v1/connectors/linkedin/sync?sync_messages=true&sync_connections=true" \
    -H "X-API-Key: ${CDB_API_KEY}"
  
  # Asynchronous offload to Celery worker
  curl -X POST "http://localhost:8000/api/v1/connectors/linkedin/sync?async_run=true" \
    -H "X-API-Key: ${CDB_API_KEY}"
  ```

### Background Task
- **Celery Beat Schedule**: `sync_linkedin_direct` runs every `LINKEDIN_SYNC_HOURS_INTERVAL` (default 6h) defined in `cdb.workers.celery_app`.
- **Healing & Timestamps**: Accurately computes `last_sent_at` from message timestamps to populate `Activity.occurred_at`.

---

## 2. Direct Notion Connector

Syncs meeting notes, attendee lists, summaries, and action items directly into `IntakeNotionMeetingNote` and `Activity` records.

### Configuration (`.env`)
```env
NOTION_API_KEY=secret_...
NOTION_SYNC_HOURS_INTERVAL=6
NOTION_MEETING_NOTES_DATABASE_IDS=3876e98d4ef8807eab9be1b0b029246c,3876e98d4ef880a6a61ae99d8912694f
# Optional Jager DB Fallback URL
JAGER_DATABASE_URL=postgresql://jager:jager@localhost:5432/jager
```

### Sync Modes
1. **`notion_api` (Default)**: Directly queries Notion REST API `/v1/databases/{id}/query`.
2. **`jager_db`**: Fallback reader querying `s_notion.meeting_notes` table in Jager's PostgreSQL instance.
3. **`auto`**: Uses Notion API if token exists, falling back to Jager DB.

### Endpoints
- **Status Probe**: `GET /api/v1/connectors/notion/status`
- **Trigger Sync**:
  ```bash
  # Synchronous run
  curl -X POST "http://localhost:8000/api/v1/connectors/notion/sync?source=auto" \
    -H "X-API-Key: ${CDB_API_KEY}"
  
  # Background Celery task
  curl -X POST "http://localhost:8000/api/v1/connectors/notion/sync?async_run=true" \
    -H "X-API-Key: ${CDB_API_KEY}"
  ```

---

## 3. General Ingestion & Backfill Endpoints

| Channel | Endpoint | Description |
|---------|----------|-------------|
| **LinkedIn Connections** | `POST /api/v1/ingest/linkedin-connections` | Ingests CSV or API connection batches |
| **LinkedIn Messages** | `POST /api/v1/ingest/linkedin-messages` | Ingests thread messages and timestamps |
| **Notion Meeting Notes** | `POST /api/v1/ingest/notion-meeting-notes` | Ingests structured meeting debriefs |
| **Complete Backfill** | `POST /api/v1/ingest/backfill` | Backfills unlinked entities and recomputes segments |
| **Manual / CSV** | `POST /api/v1/ingest/manual` | Dynamic spreadsheet row ingestion |
