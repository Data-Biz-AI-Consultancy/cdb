---
name: cdb-connector-ops
description: >-
  Use this skill for operational management, configuration, and debugging of CDB's native
  data connectors (Direct LinkedIn Connector and Direct Notion Connector), including environment
  variables, Celery Beat sync schedules, on-demand trigger endpoints, and Jager DB fallback modes.
---

# CDB Native Connectors Operations Guide

CDB includes native background connectors to synchronize external platform data directly without requiring intermediate orchestration tools.

Self-hosted operators put connector secrets in deployment env vars. Those values are empty by default and are never seeded with a personal workspace. SaaS tenants do not use these env vars: CDB Hub stores each tenant's Notion and LinkedIn credentials in its encrypted vault and passes the decrypted token, Notion API key, and database IDs explicitly into the core connector constructors.

---

## 1. Direct LinkedIn Connector

Syncs connections, profile URLs, and 28-day message interaction histories via LinkedIn's Member Portability API.

### Configuration (`.env`, self-hosted only)
```env
LINKEDIN_ACCESS_TOKEN=AQX...
# Optional. Empty labels the account owner as "LinkedIn account".
LINKEDIN_ACCOUNT_OWNER_NAME=
LINKEDIN_SYNC_HOURS_INTERVAL=6   # Celery Beat interval in hours (default: 6)
```

`LINKEDIN_ACCESS_TOKEN` is required for LinkedIn sync. The Celery task returns `not_configured` and does not call LinkedIn when the token is unset.

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

### Configuration (`.env`, self-hosted only)
```env
NOTION_API_KEY=secret_...
NOTION_SYNC_HOURS_INTERVAL=6
# Operator-supplied. Required only when Notion API sync is enabled.
NOTION_MEETING_NOTES_DATABASE_IDS=your-database-id-1,your-database-id-2
# Optional Jager DB Fallback URL
JAGER_DATABASE_URL=postgresql://jager:jager@localhost:5432/jager
```

`NOTION_API_KEY` and `NOTION_MEETING_NOTES_DATABASE_IDS` are required together for `notion_api` sync, and for `auto` when the API key is set. The Celery task returns `not_configured` and does not call Notion when either value is missing for that source. `jager_db` uses `JAGER_DATABASE_URL` and does not read the Notion key or database IDs. An empty database-id env value stays empty.

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
