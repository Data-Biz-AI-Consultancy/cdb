---
name: cdb-add-connector
description: >-
  Use this skill when the user wants to add a new data connector to CDB
  (e.g., a new CRM, email provider, or calendar), following the existing
  LinkedIn/Notion connector pattern: API client, intake model, ingest endpoint,
  entity resolution hooks, ingestion service, and Jager REST call integration.
---

# CDB — Adding a New Data Connector

CDB has two existing connector patterns to follow:
- **LinkedIn** (`src/backend/cdb/services/connectors/linkedin.py`) — parses CSV exports and calls ingest endpoint
- **Notion** (`src/backend/cdb/services/connectors/notion.py`) — parses Notion API webhook/export and calls ingest endpoint

All connectors follow the same three-layer architecture:

```
Connector (parse / normalise) → Intake table (raw staging) → Ingestion service (ER + resolve)
```

---

## Step 1 — Define the Intake Model

Add a SQLAlchemy model for the raw staging row in `src/backend/cdb/models/intake.py`:

```python
class IntakeMySource(Base):
    __tablename__ = "intake_mysource_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    # ... source-specific raw fields ...
    status: Mapped[str] = mapped_column(String(50), default="pending")
    raw_payload: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

Register it in `src/backend/cdb/models/__init__.py`.

---

## Step 2 — Write the Alembic Migration

```bash
cd src/backend
uv run alembic revision --autogenerate -m "add intake_mysource_records table"
# Review the generated file in db/alembic/versions/
uv run alembic upgrade head
```

See: [`db/README.md`](../../src/backend/db/README.md) for full migration conventions.

---

## Step 3 — Define Pydantic Schemas

Add request/response schemas in `src/backend/cdb/schemas/ingestion.py`:

```python
class MySourceRecord(BaseModel):
    source_id: str
    first_name: str
    last_name: str
    email: str | None = None
    company: str | None = None
    # ...

class MySourceIngestRequest(BaseModel):
    records: list[MySourceRecord]
    source_label: str = "mysource"
```

---

## Step 4 — Implement the Connector

Create `src/backend/cdb/services/connectors/mysource.py`:

```python
async def parse_mysource_export(raw_data: list[dict]) -> MySourceIngestRequest:
    """Normalises raw export records into CDB ingest format."""
    records = []
    for row in raw_data:
        records.append(MySourceRecord(
            source_id=row["id"],
            first_name=row.get("firstName", ""),
            last_name=row.get("lastName", ""),
            email=row.get("email"),
            company=row.get("company"),
        ))
    return MySourceIngestRequest(records=records)
```

Register it in `src/backend/cdb/services/connectors/__init__.py`.

---

## Step 5 — Implement the Ingestion Service Function

Add `ingest_mysource_records()` in `src/backend/cdb/services/ingestion/ingestion.py`
following the `ingest_linkedin_connections()` pattern:

1. Deduplicate against the intake table by `source_id`.
2. Insert into `IntakeMySource` with `status="pending"`.
3. Call `_resolve_mysource_record(db, intake)` for incremental Entity Resolution.
4. Commit and return `IngestResponse`.

The resolver should call:
- `normalise_email()`, `normalise_linkedin_url()` from `services/entity_resolution/normalise.py`
- `evaluate_person_match()` from `services/entity_resolution/rules.py`
- `ERCandidatePair` to queue ambiguous matches for review.

---

## Step 6 — Add the FastAPI Route

In `src/backend/cdb/api/v1/connectors.py`, add:

```python
@router.post("/ingest/mysource-records", response_model=IngestResponse)
async def ingest_mysource(
    request: MySourceIngestRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_api_key),
):
    return await ingest_mysource_records(db, request)
```

The router is registered in `src/backend/cdb/api/v1/router.py`.

---

## Step 7 — Connect Jager to the New Endpoint

Jager calls CDB exclusively via REST (see Jager `AGENTS.md` §CDB Integration Conventions).

In the Jager repo, add a pipeline or n8n workflow that:
1. Fetches/parses the new source data.
2. POSTs to `{CDB_SERVICE_URL}/api/v1/ingest/mysource-records` with `X-API-Key: {CDB_API_KEY}`.

---

## Step 8 — Write Tests

```bash
# Test location
src/backend/tests/services/ingestion/test_mysource_ingestion.py
src/backend/tests/services/connectors/test_mysource_connector.py
```

Follow the pattern in existing ingestion tests. Use `aiosqlite` for the in-memory DB fixture.

---

## Step 9 — Verify & Lint

```bash
cd src/backend
ruff check --fix .
ruff format .
pytest tests/services/ingestion/ tests/services/connectors/
```

---

## Key Reference Files

| File | Purpose |
|------|---------|
| [`connectors/linkedin.py`](../../src/backend/cdb/services/connectors/linkedin.py) | LinkedIn connector pattern |
| [`connectors/notion.py`](../../src/backend/cdb/services/connectors/notion.py) | Notion connector pattern |
| [`services/ingestion/ingestion.py`](../../src/backend/cdb/services/ingestion/ingestion.py) | Ingestion service (ER + resolve) |
| [`models/intake.py`](../../src/backend/cdb/models/intake.py) | Raw intake staging models |
| [`api/v1/connectors.py`](../../src/backend/cdb/api/v1/connectors.py) | FastAPI connector routes |
| [`services/entity_resolution/normalise.py`](../../src/backend/cdb/services/entity_resolution/normalise.py) | Normalisation helpers |
| [`db/README.md`](../../src/backend/db/README.md) | Schema & migration guide |
