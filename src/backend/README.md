# CDB — Backend Application Architecture

The **CDB Backend** is a high-performance Python application built on **FastAPI**, **SQLAlchemy 2.0 (Async)**, **PostgreSQL 16**, and **Celery / Redis**.

It follows a **Layered Clean Architecture** separating API transport, request validation, domain logic, persistence, and async background workers.

---

## 🏛️ Directory Structure & Layer Responsibilities

```
src/backend/cdb/
├── api/          # 1. Presentation Layer (FastAPI routes & auth dependencies)
├── schemas/      # 2. Validation Layer (Pydantic v2 request/response contracts)
├── services/     # 3. Domain Logic Layer (Entity Resolution, Signals, NBA, Ingestion)
├── models/       # 4. Persistence Layer (SQLAlchemy 2.0 Async ORM models)
├── core/         # 5. Infrastructure (Database engine, security JWT/bcrypt, config)
├── workers/      # 6. Background Workers (Celery app & async task definitions)
└── main.py       # Application entrypoint & middleware setup
```

---

## 💡 Key Architectural Guidelines

1. **Keep `models/` (DB) and `schemas/` (API) Separate**: Physical tables live in `models/`; public serialized JSON shapes live in `schemas/`.
2. **Thin Handlers, Rich Services**: Route functions in `api/` handle HTTP concerns only; business logic resides in `services/`.
3. **Async Everywhere**: Use `async`/`await` for all database queries (`AsyncSession`) and I/O operations.
4. **One organization per database**: `Person.is_internal` and unanswered-conversation host detection read `cdb.core.internal_identity`. Defaults come from `INTERNAL_EMAIL_DOMAINS`, `INTERNAL_MEMBER_EMAILS`, and `INTERNAL_HOST_IDENTIFIERS` (email lists empty; host tokens `host` and `me`). An embedding process calls `register_internal_identity_policy()` or sets `internal_identity_policy_context`. Schema routing and tenant registries stay in CDB Hub.

---

## ⚡ Quick Start & Verification

```bash
cd src/backend

# Run test suite
uv run pytest -v

# Run linters & formatters
uv run ruff check .
uv run ruff format --check .
```
