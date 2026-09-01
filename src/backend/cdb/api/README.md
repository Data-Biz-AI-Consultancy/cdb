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

### `GET /activities/stats`

Returns aggregated activity metrics grouped by type and source across the entire interaction history.

**Response 200:**
```json
{
  "total": 42,
  "by_type": {
    "meeting": 15,
    "linkedin_message": 20,
    "email": 0,
    "call": 5,
    "note": 2
  },
  "by_source": {
    "linkedin": 20,
    "notion": 15,
    "manual": 7
  },
  "timeline": [
    {
      "date": "2026-08-30",
      "total": 8,
      "by_type": { "meeting": 2, "linkedin_message": 4, "call": 2 }
    },
    {
      "date": "2026-09-01",
      "total": 12,
      "by_type": { "meeting": 5, "linkedin_message": 5, "note": 2 }
    }
  ]
}
```

### `GET /activities`

List chronological activity logs with optional multi-dimensional filters, full-text search, and pagination.

**Query params:** 
- `q` (string, optional): Search query matching against title, summary, raw notes, contact names/emails, or company names.
- `person_id` (UUID, optional): Filter by associated contact.
- `company_id` (UUID, optional): Filter by associated company.
- `type` (`meeting` | `linkedin_message` | `email` | `call` | `note` | `whatsapp`, optional).
- `source` (`notion` | `gmail` | `linkedin` | `whatsapp` | `manual`, optional).
- `from` / `to` (ISO 8601 datetime strings, optional).
- `page` (int, 1-indexed, optional).
- `page_size` / `limit` (int 1-200, default 50).
- `cursor` (string, optional).
- `sort` (field name, default: `occurred_at`).
- `order` (`asc` | `desc`, default: `desc`).

**Response 200:**
```json
{
  "data": [
    {
      "id": "c1f111df-a86d-48f9-a1f4-4903db22a74b",
      "person_id": "f21b2e57-3f5e-447f-ac4e-3fe1ed92de36",
      "company_id": "a8fb6679-db72-4eeb-8dc7-3a4aa0a1078b",
      "person": {
        "id": "f21b2e57-3f5e-447f-ac4e-3fe1ed92de36",
        "first_name": "Alice",
        "last_name": "Smith",
        "primary_email": "alice@taxfix.com",
        "avatar_url": null,
        "linkedin_url": "https://linkedin.com/in/alice-smith"
      },
      "company": {
        "id": "a8fb6679-db72-4eeb-8dc7-3a4aa0a1078b",
        "name": "Taxfix",
        "domain": "taxfix.com",
        "avatar_url": null,
        "industry": "Fintech"
      },
      "type": "meeting",
      "source": "notion",
      "source_id": "notion-block-1234",
      "occurred_at": "2026-09-01T10:00:00Z",
      "title": "Executive Sync with Taxfix",
      "summary": "Reviewed data platform expansion and signed SLA",
      "raw_content": "Transcript and notes...",
      "attributes": {},
      "created_at": "2026-09-01T10:00:00Z",
      "updated_at": "2026-09-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "next_cursor": "20",
    "has_more": true,
    "total": 42
  }
}
```

### `POST /activities`

Create a manual activity or log notes/meetings.

```json
{
  "person_id": "<uuid>",
  "company_id": "<uuid>",
  "type": "call",
  "source": "manual",
  "occurred_at": "2026-08-19T14:00:00Z",
  "title": "Discovery call",
  "summary": "Discussed consulting scope. Follow up in 2 weeks.",
  "raw_content": "Detailed conversation transcript..."
}
```

### `GET /activities/{id}` / `PATCH /activities/{id}` / `DELETE /activities/{id}`

Standard CRUD for individual activity logs with populated `person` and `company` metadata.

---

## 8. Leads

### `GET /leads`

**Query params:** 
- `q` (string, optional): Search query matching against description/notes, intent, contact name/email, and company name.
- `stage` (`new` | `contacted` | `qualified` | `converted` | `disqualified`, optional).
- `source` (`linkedin_message` | `referral` | `inbound` | `event` | `manual`, optional).
- `signal_strength` (`strong` | `medium` | `weak`, optional).
- `owner_id` (UUID, optional).
- `person_id` (UUID, optional).
- `company_id` (UUID, optional).
- `sort` (`created_at` | `updated_at` | `stage` | `signal_strength`, default: `created_at`).
- `order` (`desc` | `asc`, default: `desc` — **most recent lead first**).
- `page` (int, 1-indexed page number, default 1).
- `page_size` / `limit` (int, default 50, range 1-200).
- `cursor` (string, pagination offset).

**Response (Paginated):**
```json
{
  "data": [
    {
      "id": "8e1361d5-703e-47cb-ae26-ef5401e3b84e",
      "person_id": "a355d8f3-4765-4549-87ea-5b2677153c99",
      "company_id": "99b1a50a-f901-4475-8121-6677464a0be9",
      "owner_id": null,
      "title": "Networking Inquiry",
      "stage": "new",
      "source": "linkedin_message",
      "source_ref_id": "li_convo:2-ZDY...",
      "intent": "networking_inquiry",
      "signal_strength": "medium",
      "notes": "LinkedIn Conversation Summary (3 messages, 2026-08-05 to 2026-08-05)...",
      "description": "LinkedIn Conversation Summary (3 messages, 2026-08-05 to 2026-08-05)...",
      "person_name": "Abdul Reyyan",
      "person_email": "abdul.reyyan@example.com",
      "person_avatar_url": null,
      "company_name": "Data Biz - AI & Data Consultancy",
      "company_domain": "databiz.ai",
      "disqualification_reason": null,
      "converted_at": null,
      "converted_opportunity_id": null,
      "created_at": "2026-08-07T22:01:31.623096Z",
      "updated_at": "2026-08-07T22:01:31.623096Z"
    }
  ],
  "pagination": {
    "next_cursor": "50",
    "has_more": true,
    "total": 2143
  }
}
```

#### Simplified Lead Stages & Staleness
- **Active Pipeline Stages**: `new`, `contacted`, `qualified`, `stale` (queried with `?stage=active`).
- **Staleness Tracking**:
  - **Stale (`30-90 days` without activity)**: Flagged with `is_stale=true` and `staleness_status="stale"`.
  - **Expired (`> 90 days` without activity)**: **Auto-disqualified & resolved** with `is_expired=true`, `staleness_status="expired"`, and default `disqualification_reason="Auto-disqualified: Expired after {days}d inactivity"`.
- **Exclusion from Total Active Leads**:
  - `converted`, `disqualified`, and `expired` leads are classified as terminal/resolved states and are excluded from the main Active Pipeline count and default active view.
  - Resolved leads can be queried via `?stage=converted`, `?stage=disqualified`, `?stage=expired`, or `?stage=all`.

### `POST /leads`

```json
{
  "person_id": "<uuid>",
  "company_id": "<uuid>",
  "source": "linkedin_message",
  "source_ref_id": "conversation:abc123",
  "intent": "open to consulting",
  "signal_strength": "strong",
  "description": "Reached out after my post on async work regarding AI consulting.",
  "notes": "Reached out after my post on async work regarding AI consulting."
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

Convert a qualified lead into an active opportunity deal.

```json
{
  "title": "Data Biz Strategy Project",
  "value": 15000,
  "currency": "EUR",
  "expected_close_date": "2026-09-30"
}
```

### `POST /leads/bulk-update`

Bulk update multiple leads simultaneously (stage, signal strength, source, intent, or appending progress notes).

```json
{
  "lead_ids": ["<uuid1>", "<uuid2>"],
  "stage": "contacted",
  "signal_strength": "strong",
  "source": "linkedin_message",
  "intent": "consulting_opportunity",
  "append_notes": "Bulk outreach completed during campaign."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "updated_count": 2,
  "affected_ids": ["<uuid1>", "<uuid2>"],
  "message": "Successfully bulk updated 2 leads."
}
```

### `POST /leads/bulk-convert`

Bulk convert selected leads into active opportunity deals simultaneously.

```json
{
  "lead_ids": ["<uuid1>", "<uuid2>"],
  "default_value": 10000,
  "currency": "EUR",
  "expected_close_date": "2026-10-31",
  "title_suffix": "— Opportunity Deal"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "updated_count": 2,
  "affected_ids": ["<uuid1>", "<uuid2>"],
  "message": "Successfully converted 2 leads to opportunities."
}
```

### `POST /leads/bulk-disqualify`

Bulk disqualify/reject selected leads and record the rejection reason and notes.

```json
{
  "lead_ids": ["<uuid1>", "<uuid2>"],
  "reason": "wrong_fit",
  "notes": "Rejected during quarterly pipeline triage."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "updated_count": 2,
  "affected_ids": ["<uuid1>", "<uuid2>"],
  "message": "Successfully disqualified 2 leads."
}
```

### `POST /leads/bulk-delete`

Permanently remove multiple leads simultaneously.

```json
{
  "lead_ids": ["<uuid1>", "<uuid2>"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "updated_count": 2,
  "affected_ids": ["<uuid1>", "<uuid2>"],
  "message": "Successfully deleted 2 leads."
}
```

---

## 9. Opportunities

Track and advance sales deals through a multi-stage pipeline with Kanban interaction, enriched contact & organization affiliations, complete audit history tracking, and automated staleness & expiration lifecycle management.

### Staleness, Expiration & Overdue Resolution Rules
Active pipeline opportunities (`prospect`, `qualified`, `proposal`, `negotiation`) dynamically track inactivity and resolution target dates:
- **Active**: Activity within the last 30 days (`staleness_status: "active"`).
- **Stale**: Inactive for 30+ days without new notes or stage updates (`is_stale: true`, `staleness_status: "stale"`).
- **Expired**: Inactive for 90+ days (`is_expired: true`, `staleness_status: "expired"`).
- **Overdue Resolution**: If `expected_close_date` is earlier than today's date on an active deal (`is_overdue: true`, `days_overdue: int`).
- **Closed Deals**: `closed_won` and `closed_lost` deals are never marked as stale, expired, or overdue.

All opportunity responses include `is_stale`, `is_expired`, `days_inactive`, `staleness_status`, `last_activity_at`, `is_overdue`, and `days_overdue`.

### `GET /opportunities`

List all opportunities (paginated).

**Query params:** 
- `stage` (`prospect` | `qualified` | `proposal` | `negotiation` | `closed_won` | `closed_lost`)
- `owner_id` (UUID)
- `person_id` (UUID)
- `company_id` (UUID)
- `limit` / `page_size` (int 1-200, default 50)
- `cursor` (string offset)
- `sort` (`created_at` | `updated_at` | `title` | `value` | `stage` | `probability`)
- `order` (`desc` | `asc`)

### `GET /opportunities/actions`

Lists available opportunity action dimensions for history auditing.

### `POST /opportunities`

Create a new opportunity.

```json
{
  "title": "Consulting engagement — Acme Corp Q3",
  "description": "Multi-phase analytics transformation and executive advisory.",
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

Get, update or delete an opportunity. Updates automatically log history changes (e.g. `stage_changed`, `value_updated`, `field_updated`).

### `POST /opportunities/{id}/advance`

Advance to the next sales stage in the pipeline flow (`prospect` → `qualified` → `proposal` → `negotiation`).

### `POST /opportunities/{id}/close`

Mark deal as won or lost, auto-updating probability (100% for won, 0% for lost) and recording closure notes.

```json
{
  "outcome": "closed_won",
  "notes": "Signed 1-year enterprise license."
}
```

### `POST /opportunities/{id}/persons` & `DELETE /opportunities/{id}/persons/{person_id}`

Attach or detach contact persons to/from an opportunity with assigned roles (`decision_maker`, `champion`, `influencer`, etc.).

### `POST /opportunities/{id}/companies` & `DELETE /opportunities/{id}/companies/{company_id}`

Attach or detach client/partner companies to/from an opportunity.

### `GET /opportunities/{id}/history`

Retrieve paginated history timeline with categorized audit actions, before/after diffs, and summaries.

### `POST /opportunities/{id}/history/notes`

Log meeting notes, call logs, or progress updates directly into the opportunity activity history.

```json
{
  "note": "Discovery call completed with VP of Engineering. Proposal draft requested."
}
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
