---
name: cdb-add-connector
description: >-
  Use this skill when adding a new data connector to CDB (e.g. CRM, email, calendar,
  or meeting notes) under both Single-Tenant (OSS core) and Multi-Tenant (SaaS / cdb-cloud)
  architectures. Covers intake staging models, compound tenant indexes, credential vaulting,
  tenant-scoped entity resolution, and background sync worker tasks.
---

# CDB — Adding a New Data Connector (Multi-Tenant Ready)

All connectors follow a standardized 3-layer decoupled ingestion architecture:

```
[Connector Client / Webhook] ──► [Intake Staging Table] ──► [Ingestion Service (ER & Resolve)]
```

Whether deployed in **Single-Tenant (OSS Core)** or **Multi-Tenant (`cdb-cloud` SaaS)**, connectors must follow tenant isolation guidelines from day one.

---

## 🏛️ Multi-Tenancy Design Principles for Connectors

1. **Compound Tenant Uniqueness**: External IDs (`source_id`) must be unique *per tenant*, not globally (`UNIQUE(tenant_id, source_id)`).
2. **Tenant-Scoped Entity Resolution**: Deduplication queries (`Person`, `Company`) must strictly filter `WHERE tenant_id = :tenant_id` to prevent cross-tenant data leakage.
3. **Credential Storage Modes**:
   - **Self-Hosted / BYO-Key**: Ingest API accepts client-provided API tokens or reads global environment variables.
   - **Managed SaaS (`cdb-cloud`)**: Ingestion service looks up tenant credentials from the encrypted credential vault.
4. **Worker Isolation**: Celery sync tasks must accept an explicit `tenant_id` parameter to allow per-tenant scheduling, rate-limiting, and queue routing.

---

## Step 1 — Define the Intake Model with Tenant Support

Add a declarative model in `src/backend/cdb/models/intake.py`:

```python
import datetime
from uuid import UUID
from sqlalchemy import Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column
from cdb.models.base import Base

class IntakeMySource(Base):
    __tablename__ = "intake_mysource_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # Tenant scoping (Nullable in standalone single-tenant, populated in multi-tenant)
    tenant_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), index=True, nullable=True)
    
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(255))
    last_name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    company: Mapped[str | None] = mapped_column(String(255))
    
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, resolved, failed
    raw_payload: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime.datetime] = mapped_column(default=datetime.datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("tenant_id", "source_id", name="uq_intake_mysource_tenant_source"),
        Index("ix_intake_mysource_tenant_status", "tenant_id", "status"),
    )
```

Export in `src/backend/cdb/models/__init__.py`.

---

## Step 2 — Generate Alembic Migration

```bash
cd src/backend
uv run alembic revision --autogenerate -m "add intake_mysource_records with tenant support"
# Inspect db/alembic/versions/
uv run alembic upgrade head
```

---

## Step 3 — Define Request & Schema Models

In `src/backend/cdb/schemas/ingestion.py`:

```python
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class MySourceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    source_id: str
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    company: str | None = None
    raw_payload: dict | None = None

class MySourceIngestRequest(BaseModel):
    records: list[MySourceRecord]
    source_label: str = "mysource"
    # Optional tenant_id override when called via internal services
    tenant_id: UUID | None = None
```

---

## Step 4 — Implement Connector Client / Normaliser

Create `src/backend/cdb/services/connectors/mysource.py`:

```python
from typing import Any
from cdb.schemas.ingestion import MySourceIngestRequest, MySourceRecord

def parse_mysource_export(raw_items: list[dict[str, Any]], tenant_id: UUID | None = None) -> MySourceIngestRequest:
    records = []
    for item in raw_items:
        records.append(MySourceRecord(
            source_id=str(item["id"]),
            first_name=item.get("first_name"),
            last_name=item.get("last_name"),
            email=item.get("email"),
            company=item.get("company_name"),
            raw_payload=item,
        ))
    return MySourceIngestRequest(records=records, tenant_id=tenant_id)
```

---

## Step 5 — Ingestion Service & Tenant-Scoped Entity Resolution

In `src/backend/cdb/services/ingestion/ingestion.py`:

```python
from uuid import UUID
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from cdb.models.intake import IntakeMySource
from cdb.schemas.ingestion import IngestResponse, MySourceIngestRequest

async def ingest_mysource_records(
    db: AsyncSession, 
    data: MySourceIngestRequest, 
    tenant_id: UUID | None = None
) -> IngestResponse:
    effective_tenant_id = tenant_id or data.tenant_id
    queued = 0
    duplicates_skipped = 0

    for rec in data.records:
        # Check uniqueness within tenant scope
        stmt = select(IntakeMySource).where(
            and_(
                IntakeMySource.tenant_id == effective_tenant_id,
                IntakeMySource.source_id == rec.source_id,
            )
        )
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            duplicates_skipped += 1
            continue

        intake = IntakeMySource(
            tenant_id=effective_tenant_id,
            source_id=rec.source_id,
            first_name=rec.first_name,
            last_name=rec.last_name,
            email=rec.email,
            company=rec.company,
            raw_payload=rec.raw_payload,
            status="pending",
        )
        db.add(intake)
        await db.flush()

        # Incremental resolution strictly within this tenant scope
        await _resolve_mysource_record(db, intake, tenant_id=effective_tenant_id)
        queued += 1

    await db.commit()
    return IngestResponse(queued=queued, duplicates_skipped=duplicates_skipped)
```

Inside `_resolve_mysource_record`:
- When querying existing master records:
  ```python
  stmt = select(Person).where(and_(Person.tenant_id == tenant_id, ...))
  ```

---

## Step 6 — FastAPI Ingest Router

In `src/backend/cdb/api/v1/connectors.py`:

```python
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from cdb.api.deps import get_db, get_current_user_optional, require_api_key

@router.post("/ingest/mysource", response_model=IngestResponse)
async def ingest_mysource(
    request_data: MySourceIngestRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
    auth: Any = Depends(require_api_key),
):
    # Extract tenant context if present (TenantMiddleware / Auth header)
    tenant_id = getattr(req.state, "tenant_id", None) or getattr(auth, "tenant_id", None)
    return await ingest_mysource_records(db, request_data, tenant_id=tenant_id)
```

---

## Step 7 — Tenant-Scoped Background Worker (Celery)

When adding periodic background synchronization:

```python
# src/backend/cdb/workers/tasks.py
from cdb.workers.celery_app import celery_app

@celery_app.task(name="cdb.tasks.sync_mysource_for_tenant")
def sync_mysource_for_tenant(tenant_id: str, credentials: dict | None = None):
    """Syncs a single tenant's data source with rate limiting."""
    # 1. Fetch credentials (from vault or args)
    # 2. Call connector client
    # 3. Call ingest_mysource_records()
```

---

## Step 8 — Automated Testing

Add unit & integration tests under `tests/services/ingestion/test_mysource_ingestion.py`:
- Test duplicate suppression per tenant.
- Test that tenant A and tenant B can ingest the same `source_id` without collision.
- Test that ER auto-merge never merges across different `tenant_id` values.

```bash
cd src/backend
uv run pytest tests/services/ingestion/ -v
uv run ruff check .
```
