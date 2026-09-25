---
name: cdb-api-client-patterns
description: >-
  Use this skill when interacting with or writing client code / tests for the CDB REST API,
  including authentication (JWT Bearer vs `X-API-Key`), pagination (`page`, `size`),
  standard error response envelopes, bulk operations (`bulk-update`, `bulk-delete`),
  and common entity endpoints (Persons, Companies, Activities, Signals, NBA feed).
---

# CDB REST API Client Patterns & Conventions

Base URL: `http://localhost:8000/api/v1`  
Interactive OpenAPI Swagger Docs: `http://localhost:8000/docs`

---

## 1. Authentication

CDB supports two authentication mechanisms:

1. **User JWT Bearer Token** (Interactive & Frontend Users):
   - Obtain via `POST /api/v1/auth/login` (`username`, `password`).
   - Header: `Authorization: Bearer <jwt_access_token>`
2. **Machine API Key** (Jager & External Pipelines):
   - Header: `X-API-Key: <CDB_API_KEY>`

---

## 2. Standard Response Envelopes

### Paginated List Envelope
All `GET` endpoints returning collections follow this standard JSON envelope:

```json
{
  "items": [ ... ],
  "total": 142,
  "page": 1,
  "size": 50,
  "pages": 3
}
```

Query Parameters:
- `page`: 1-indexed page number (default: `1`)
- `size`: Items per page (default: `50`, max: `200`)
- `sort_by`: Field name to sort on (e.g. `created_at`, `name`)
- `order`: `asc` or `desc` (default: `desc`)

### Standard Error Envelope
All non-2xx responses return a structured error schema:

```json
{
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Person with ID '550e8400-e29b-41d4-a716-446655440000' not found",
    "details": {}
  }
}
```

---

## 3. Key Entity Endpoints Reference

### Core CRM
- **Persons**: `GET /api/v1/persons`, `POST /api/v1/persons`, `PATCH /api/v1/persons/{id}`, `DELETE /api/v1/persons/{id}`
- **Bulk Operations**: `POST /api/v1/persons/bulk-update`, `POST /api/v1/persons/bulk-delete`
- **Companies**: `GET /api/v1/companies`, `POST /api/v1/companies`, `GET /api/v1/companies/{id}/employees`
- **Activities**: `GET /api/v1/activities`, `POST /api/v1/activities`, `GET /api/v1/activities/stats`
- **Leads & Pipeline**: `GET /api/v1/leads`, `POST /api/v1/leads`, `GET /api/v1/opportunities`

### Ingestion & Data Connectors
- **LinkedIn Connections**: `POST /api/v1/ingest/linkedin-connections`
- **LinkedIn Messages**: `POST /api/v1/ingest/linkedin-messages`
- **Notion Notes**: `POST /api/v1/ingest/notion-meeting-notes`

### Signals & Next Best Actions (NBA)
- **Catalog**: `GET /api/v1/signals/catalog`
- **Detected Signals**: `GET /api/v1/signals/detected` (supports `?category=risk&severity=high`)
- **NBA Feed**: `GET /api/v1/signals/nba/feed`
- **Company Briefs**: `GET /api/v1/companies/{id}/ai-brief`, `POST /api/v1/companies/{id}/ai-brief/regenerate`

---

## 4. References & Source Routers

- Router definitions: [`src/backend/cdb/api/v1/`](../../src/backend/cdb/api/v1/)
- Full API documentation: [`src/backend/cdb/api/README.md`](../../src/backend/cdb/api/README.md)
- OpenAPI JSON: `http://localhost:8000/openapi.json`
