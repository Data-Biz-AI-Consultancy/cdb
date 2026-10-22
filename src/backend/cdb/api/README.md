# CDB — REST API Specification

CDB provides a RESTful API built on **FastAPI**.

- **Interactive Swagger UI**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`
- **OpenAPI JSON Spec**: `http://localhost:8000/openapi.json`
- **Client & Integration Guide**: [CDB API Client Patterns Skill](../../../../.agents/skills/cdb-api-client-patterns/SKILL.md)

---

## 🔑 Global API Conventions

### Authentication
- **User JWT Bearer**: Passed via `Authorization: Bearer <token>` (obtained from `POST /api/v1/auth/login`).
- **Deployment API key**: `X-API-Key` must match the self-hosted operator's `CDB_API_KEY`. An empty value rejects every machine key. Core does not ship a built-in development or production key.

### Standard Response Envelope
All paginated collection endpoints return:
```json
{
  "items": [ ... ],
  "total": 120,
  "page": 1,
  "size": 50,
  "pages": 3
}
```

### Standard Error Envelope
All error responses return:
```json
{
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Resource with ID not found",
    "details": {}
  }
}
```

---

## 🗺️ Router Directory & Domain Endpoints

All routers live in [`src/backend/cdb/api/v1/`](v1/):

| Domain | Base Path | Description | Router Module |
|--------|-----------|-------------|---------------|
| **Auth** | `/api/v1/auth` | JWT login, token refresh, logout | [`auth.py`](v1/auth.py) |
| **Users** | `/api/v1/users` | Internal team directory, user roles, profile settings | [`users.py`](v1/users.py) |
| **Persons** | `/api/v1/persons` | Core contact directory, bulk update/delete, history logs | [`persons.py`](v1/persons.py) |
| **Companies** | `/api/v1/companies` | Client companies, employee directory, AI brief synthesis | [`companies.py`](v1/companies.py) |
| **Relationships** | `/api/v1/persons/{id}/companies` | Many-to-many person-company employment links | [`persons.py`](v1/persons.py) |
| **Activities** | `/api/v1/activities` | Interaction timeline (meetings, messages, calls) & stats | [`activities.py`](v1/activities.py) |
| **Leads & Deals** | `/api/v1/leads`, `/api/v1/opportunities` | Pipeline stages, stage transitions, conversion flows | [`leads.py`](v1/leads.py), [`opportunities.py`](v1/opportunities.py) |
| **Engagements** | `/api/v1/engagements` | Active client contract delivery, status tracking | [`engagements.py`](v1/engagements.py) |
| **Connectors & Ingest** | `/api/v1/ingest/*` | Raw intake endpoints (LinkedIn, Notion, CSVs) | [`connectors.py`](v1/connectors.py), [`ingestion.py`](v1/ingestion.py) |
| **Entity Resolution** | `/api/v1/entity-resolution/*` | Candidate pair review queue, merge/reject actions | [`er.py`](v1/er.py) |
| **Signals & NBA** | `/api/v1/signals/*` | Opportunity/risk catalog, triage feed, Next Best Action | [`signals/`](v1/signals/) |
| **Segmentation** | `/api/v1/segments` | Dynamic rule evaluation for client/prospect tiers | [`segments.py`](v1/segments.py) |
| **Health** | `/api/v1/health` | Liveness & readiness probes | [`health.py`](v1/health.py) |

---

## 🧪 Running API Tests

```bash
cd src/backend
uv run pytest tests/api/ -v
```
