# CDB — API Specification

**Version**: v1 (Draft)
**Status**: Under Review
**Last Updated**: 2026-08-20
**Base URL**: `http://cdb-api:8000/api/v1` (internal); `https://api.cdb.yourdomain.com/api/v1` (external)

---

## 1. Conventions

### 1.1 Versioning

All endpoints are prefixed with `/api/v1/`. Breaking changes bump the version prefix.

### 1.2 Authentication

All endpoints require a Bearer JWT except `/auth/login` and `/auth/register`.

```
Authorization: Bearer <access_token>
```

Token shape:
```json
{
  "sub": "<user_uuid>",
  "role": "admin | member",
  "exp": 1234567890
}
```

| Parameter | Value |
|-----------|-------|
| Algorithm | HS256 |
| Access token TTL | 60 minutes |
| Refresh token TTL | 30 days |

Refresh via `POST /auth/refresh` with the refresh token in an `HttpOnly` cookie.

### 1.3 Pagination

All list endpoints support cursor-based pagination.

**Request query params:**
```
?limit=50          # default 50, max 200
?cursor=<opaque>   # omit for first page
?sort=created_at   # column to sort by
?order=desc        # asc | desc
```

**Response envelope (list):**
```json
{
  "data": [ ... ],
  "pagination": {
    "next_cursor": "<opaque_string_or_null>",
    "has_more": true,
    "total": 1243
  }
}
```

### 1.4 Error Envelope

All errors return a consistent body:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Person with id abc123 not found.",
    "details": {}
  }
}
```

| HTTP Status | `code` | When |
|-------------|--------|------|
| 400 | `VALIDATION_ERROR` | Request body fails validation |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Authenticated but insufficient role |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 409 | `CONFLICT` | Duplicate unique field (e.g. email already exists) |
| 422 | `UNPROCESSABLE` | Semantically invalid input |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 2. Auth

### `POST /auth/login`
```json
// Request
{ "email": "alice@example.com", "password": "secret" }

// Response 200
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "user": { "id": "<uuid>", "email": "alice@example.com", "role": "admin" }
}
```

### `POST /auth/refresh`
Reads `refresh_token` from HttpOnly cookie; returns new `access_token`.

### `POST /auth/logout`
Invalidates the refresh token.

---

## 3. Persons

### `GET /persons`

List all persons (paginated, soft-deleted excluded by default).

**Query params:**
- `q` (full-text search across first_name, last_name, primary_email)
- `source` (filter by source tag)
- `country` (filter by ISO-2 country code)
- `has_open_opportunity` (bool)
- `has_open_lead` (bool)
- `include_deleted` (bool, admin only)
- `page` (int >= 1, 1-indexed page number)
- `page_size` / `limit` (int 1-200, default 50)
- `cursor` (string offset, alternative pagination)
- `sort` (`created_at` | `updated_at` | `first_name` | `last_name` | `primary_email` | `country` | `city`, default `created_at`)
- `order` (`asc` | `desc`, default `desc`)

**Response 200:**
```json
{
  "data": [
    {
      "id": "<uuid>",
      "first_name": "Alice",
      "last_name": "Smith",
      "primary_email": "alice@acme.com",
      "primary_phone": "+44 7911 000000",
      "linkedin_url": "linkedin.com/in/alice-smith",
      "city": "London",
      "country": "GB",
      "current_company": { "id": "<uuid>", "name": "Acme Corp" },
      "current_title": "VP Engineering",
      "sources": ["linkedin", "notion"],
      "last_activity_at": "2026-07-15T10:00:00Z",
      "created_at": "2026-01-10T08:00:00Z",
      "updated_at": "2026-08-27T16:00:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "<offset_or_null>",
    "has_more": false,
    "total": 1
  }
}
```

### `POST /persons`

Create a person manually.

```json
// Request
{
  "first_name": "Alice",
  "last_name": "Smith",
  "primary_email": "alice@acme.com",
  "linkedin_url": "https://linkedin.com/in/alice-smith",
  "primary_phone": "+44 7911 000000",
  "city": "London",
  "country": "GB"
}

// Response 201 — full person object
```

### `POST /persons/bulk-update`

Bulk update contact attributes and cleanup dirty records across multiple persons simultaneously.

```json
// Request
{
  "person_ids": ["<uuid1>", "<uuid2>"],
  "city": "London",
  "country": "GB",
  "add_sources": ["manual_cleanup", "verified"],
  "remove_sources": ["dirty_data"],
  "attributes": { "cleaned": true }
}

// Response 200
{
  "success": true,
  "updated_count": 2,
  "affected_ids": ["<uuid1>", "<uuid2>"],
  "message": "Successfully updated 2 person(s)."
}
```

### `POST /persons/bulk-delete`

Bulk soft-delete or permanently delete multiple persons.

```json
// Request
{
  "person_ids": ["<uuid1>", "<uuid2>"],
  "hard": false
}

// Response 200
{
  "success": true,
  "updated_count": 2,
  "affected_ids": ["<uuid1>", "<uuid2>"],
  "message": "Successfully soft deleted 2 person(s)."
}
```

### `GET /persons/actions`

Lists all person action dimension entries for categorizing changelog entries.

**Response 200:**
```json
[
  {
    "id": "record_created",
    "name": "Record Created",
    "category": "profile",
    "description": "Initial creation of the person golden record",
    "icon": "✨",
    "color": "emerald",
    "created_at": "2026-08-28T10:00:00Z",
    "updated_at": "2026-08-28T10:00:00Z"
  }
]
```

### `GET /persons/{id}/history`

Retrieves the paginated audit changelog and status change history for a person.

**Query params:**
- `limit` / `page_size` (int 1-200, default 50)
- `cursor` (string offset)
- `sort` (`created_at`, default `created_at`)
- `order` (`asc` | `desc`, default `desc`)

**Response 200:**
```json
{
  "data": [
    {
      "id": "<uuid>",
      "person_id": "<uuid>",
      "action_id": "profile_updated",
      "action": {
        "id": "profile_updated",
        "name": "Profile Updated",
        "category": "profile",
        "icon": "✏️",
        "color": "blue",
        "created_at": "2026-08-28T10:00:00Z",
        "updated_at": "2026-08-28T10:00:00Z"
      },
      "changed_by_id": "<uuid>",
      "field_name": null,
      "old_value": null,
      "new_value": null,
      "changes": {
        "city": { "old": "Berlin", "new": "Munich" }
      },
      "summary": "Updated profile fields: city",
      "created_at": "2026-08-28T10:05:00Z",
      "updated_at": "2026-08-28T10:05:00Z"
    }
  ],
  "pagination": {
    "next_cursor": null,
    "has_more": false,
    "total": 1
  }
}
```

### `GET /persons/{id}`

Full person detail including career timeline and linked leads/opportunities.

```json
{
  "id": "<uuid>",
  "first_name": "Alice",
  "last_name": "Smith",
  "primary_email": "alice@acme.com",
  "secondary_emails": ["asmith@old.com"],
  "linkedin_url": "linkedin.com/in/alice-smith",
  "primary_phone": "+44...",
  "city": "London",
  "country": "GB",
  "avatar_url": null,
  "sources": ["linkedin", "notion"],
  "source_ids": { "linkedin": "ACoAA..." },
  "attributes": {},
  "career": [
    {
      "company": { "id": "<uuid>", "name": "Acme Corp" },
      "title": "VP Engineering",
      "is_current": true,
      "started_at": "2023-03-01",
      "ended_at": null
    }
  ],
  "open_leads_count": 1,
  "open_opportunities_count": 2,
  "created_at": "2026-01-10T08:00:00Z",
  "updated_at": "2026-07-01T12:00:00Z"
}
```

### `PATCH /persons/{id}`

Partial update of any mutable field. Immutable: `id`, `sources`, `source_ids`, `created_at`.

### `DELETE /persons/{id}`

Soft-delete (sets `deleted_at`). Use `DELETE /persons/{id}?hard=true` (admin only) for permanent deletion.

---

## 4. Companies

### `GET /companies`

**Query params:**
- `q` (string search by name or domain)
- `country` (2-letter ISO country code)
- `industry` (string filter)
- `page` (int >= 1, default 1)
- `page_size` / `limit` (int 1-200, default 50)
- `cursor` (string offset)
- `sort` (`pipeline_default` | `leads` | `contacts` | `name` | `created_at`, default `pipeline_default`)
- `order` (`asc` | `desc`, default `desc`)

**Response 200:**
```json
{
  "data": [
    {
      "id": "<uuid>",
      "name": "Acme AI Corp",
      "domain": "acme.ai",
      "industry": "Artificial Intelligence",
      "size_range": "51-200",
      "country": "DE",
      "city": "Munich",
      "contacts_count": 5,
      "leads_count": 3,
      "open_opportunities_count": 2,
      "total_opportunities_value": 175000.0,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-08-01T12:00:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "50",
    "has_more": true,
    "total": 320,
    "total_contacts_count": 3041,
    "total_leads_count": 142,
    "total_pipeline_value": 1250000.0
  }
}
```

### `POST /companies`

```json
{ "name": "Acme Corp", "domain": "acme.com", "industry": "Technology", "country": "GB" }
```

### `GET /companies/{id}`

Full detail including linked persons (with current role) and open opportunities.

### `GET /companies/{id}/employees`

List all persons associated with the company, differentiating between currently active staff (`is_current=true`) and alumni/previous employees (`is_current=false`).

**Query params:** `current_only` (bool, default `false`).

**Response 200:**
```json
[
  {
    "relationship_id": "<uuid>",
    "person_id": "<uuid>",
    "first_name": "Alice",
    "last_name": "Smith",
    "primary_email": "alice@acme.com",
    "linkedin_url": "linkedin.com/in/alice-smith",
    "city": "London",
    "country": "GB",
    "title": "VP Engineering",
    "is_current": true,
    "started_at": "2023-03-01",
    "ended_at": null,
    "attributes": {
      "segment": "hiring_decision_makers",
      "temperature": "hot"
    }
  }
]
```

### `PATCH /companies/{id}` / `DELETE /companies/{id}`

Same conventions as persons.

---

## 5. Person-Company Relationships

### `POST /persons/{person_id}/companies`

Add or update a role at a company.

```json
{
  "company_id": "<uuid>",
  "title": "CTO",
  "is_current": true,
  "started_at": "2023-01-01"
}
```

### `PATCH /persons/{person_id}/companies/{company_id}`

Update `title`, `is_current`, `ended_at`.

### `DELETE /persons/{person_id}/companies/{company_id}`

Removes the relationship row (not the company).

---

## 6. Segmentation & Contact Intelligence

### `POST /segments/evaluate`

Triggers batch evaluation of dynamic Person segments (`clients_and_prospects`, `former_colleagues_alumni`, `recruiters_and_talent`, `hiring_decision_makers`, `peer_collaborators`, `general_network`), Engagement Temperatures (`hot`, `warm`, `dormant`, `cold`), and GEO tags.

**Response 200:**
```json
{
  "status": "success",
  "total_persons_evaluated": 1250,
  "person_segments": {
    "clients_and_prospects": 42,
    "former_colleagues_alumni": 85,
    "recruiters_and_talent": 110,
    "hiring_decision_makers": 310,
    "peer_collaborators": 95,
    "general_network": 608
  },
  "engagement_temperatures": {
    "hot": 56,
    "warm": 210,
    "dormant": 480,
    "cold": 504
  },
  "geo_breakdown": {
    "GB": 450,
    "DE": 380,
    "US": 220
  }
}
```

---

## 7. Activities

### `GET /activities`

**Query params:** `person_id`, `company_id`, `type`, `source`, `from` (ISO date), `to` (ISO date).

**Response 200:** paginated list ordered by `occurred_at DESC`.

### `POST /activities`

Create a manual activity.

```json
{
  "person_id": "<uuid>",
  "company_id": null,
  "type": "call",
  "source": "manual",
  "occurred_at": "2026-08-19T14:00:00Z",
  "title": "Discovery call",
  "summary": "Discussed consulting scope. Follow up in 2 weeks."
}
```

### `GET /activities/{id}` / `PATCH /activities/{id}` / `DELETE /activities/{id}`

Standard CRUD. `source_id`-tagged activities (auto-imported) can be patched but not deleted.

---

## 8. Leads

### `GET /leads`

**Query params:** `stage`, `source`, `owner_id`, `person_id`, `company_id`.

### `POST /leads`

```json
{
  "person_id": "<uuid>",
  "company_id": "<uuid>",
  "source": "linkedin_message",
  "source_ref_id": "conversation:abc123",
  "intent": "open to consulting",
  "signal_strength": "strong",
  "notes": "Reached out after my post on async work."
}
```

### `GET /leads/{id}` / `PATCH /leads/{id}`

### `POST /leads/{id}/advance`

Move lead to next stage.

```json
// Request — optional notes
{ "notes": "Confirmed budget available." }

// Response 200 — updated lead with new stage
```

### `POST /leads/{id}/disqualify`

```json
{ "reason": "no_budget" }
```

### `POST /leads/{id}/convert`

Convert a qualified lead into an Opportunity.

```json
// Request
{ "title": "Consulting engagement — Acme Corp Q3 2026" }

// Response 201 — new opportunity object
// Also sets lead.stage = 'converted' and lead.converted_opportunity_id
```

---

## 9. Opportunities

### `GET /opportunities`

**Query params:** `stage`, `owner_id`, `person_id`, `company_id`.

### `POST /opportunities`

```json
{
  "title": "Consulting engagement — Acme Corp Q3",
  "stage": "prospect",
  "value": 15000,
  "currency": "EUR",
  "probability": 60,
  "expected_close_date": "2026-09-30",
  "person_ids": [{ "person_id": "<uuid>", "role": "decision_maker" }],
  "company_ids": [{ "company_id": "<uuid>", "role": "client" }]
}
```

### `GET /opportunities/{id}` / `PATCH /opportunities/{id}` / `DELETE /opportunities/{id}`

### `POST /opportunities/{id}/advance`

Advance to next stage.

### `POST /opportunities/{id}/close`

```json
{ "outcome": "closed_won" }   // or "closed_lost"
```

---

## 10. Entity Resolution

### `GET /entity-resolution/queue`

List pending candidate pairs.

**Query params:** `status` (default `pending`), `min_score` (float, Phase 3).

**Response 200:**
```json
{
  "data": [
    {
      "id": "<uuid>",
      "person_a": { "id": "<uuid>", "first_name": "Alice", "last_name": "Smith", "primary_email": "alice@acme.com", "sources": ["linkedin"] },
      "person_b": { "id": "<uuid>", "first_name": "Alice", "last_name": "Smyth", "primary_email": null, "sources": ["notion"] },
      "match_signals": { "name_similarity": 0.96, "company_domain_match": true, "trigger_rule": 6 },
      "ml_score": 0.91,
      "status": "pending",
      "created_at": "2026-08-19T09:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### `POST /entity-resolution/queue/{id}/accept`

Accepts the merge. Person B is merged into Person A (older record wins).

**Response 200:** `{ "master_person_id": "<uuid>", "merged_person_id": "<uuid>" }`

### `POST /entity-resolution/queue/{id}/reject`

**Response 200:** `{ "status": "rejected" }`

### `POST /entity-resolution/run`

Trigger a full ER re-run (admin only, async — returns job ID).

```json
// Response 202
{ "job_id": "<uuid>", "status": "queued" }
```

---

## 11. Ingestion (Internal — Jager use)

These endpoints are called by Jager's n8n workflows. They require a service-to-service API key header instead of a user JWT:

```
X-API-Key: <service_token>
```

### `POST /ingest/linkedin-connections`

Idempotent batch upsert into `intake_linkedin_connections`. Triggers incremental ER run.

```json
{
  "records": [
    {
      "connection_id": "ACoAA...",
      "first_name": "Bob",
      "last_name": "Jones",
      "profile_url": "https://linkedin.com/in/bob-jones",
      "email_address": "bob@example.com",
      "company": "Acme",
      "position": "CEO",
      "connected_at": "2025-06-01T00:00:00Z"
    }
  ]
}
// Response 202: { "queued": 42, "duplicates_skipped": 3 }
```

### `POST /ingest/linkedin-messages`

Idempotent batch upsert into `intake_linkedin_messages`. Performs NLP intent & signal strength detection, automatically creates/enriches `Lead` objects.

### `POST /ingest/notion-meeting-notes`

Idempotent batch upsert into `intake_notion_meeting_notes` with multi-attendee parsing.

### `POST /ingest/backfill`

Triggers a 1-off backfill across all historical intake tables:
- Resolves companies from `intake_linkedin_connections` into `companies` and `person_company_relationships`.
- Ingests `intake_linkedin_messages` into `activities` and generates `Lead` entries.
- Links `intake_notion_meeting_notes` to matching person contacts and logs meeting activities.
- Re-evaluates all person segments and dynamic engagement temperatures.

```bash
curl -X POST "https://api.cdb.internal/api/v1/ingest/backfill" \
  -H "X-API-Key: <your_api_key>"
```

### `POST /ingest/manual`

Upload a CSV/XLSX batch. Multipart form:
- `file`: the uploaded file
- `source_label`: string label for the batch (e.g. `"Substack export 2026-07"`)
- `entity_type`: `person | company`
- `column_map`: JSON string mapping source columns to CDB fields

---

*See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for field definitions and [ENTITY_RESOLUTION_SPEC.md](ENTITY_RESOLUTION_SPEC.md) for ER logic.*
