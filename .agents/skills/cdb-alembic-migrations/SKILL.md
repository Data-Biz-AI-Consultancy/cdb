---
name: cdb-alembic-migrations
description: >-
  Use this skill when modifying CDB PostgreSQL database models, authoring new Alembic
  migrations, applying schema upgrades/downgrades, handling dimension table seeds
  (`person_actions`, `opportunity_actions`, `signals`), or resolving migration conflicts.
---

# CDB Database Schema & Alembic Migration Guide

All schema changes in CDB must be tracked via **Alembic** migrations located in `src/backend/db/alembic/`.

---

## 1. Directory & Configuration Structure

```
src/backend/
├── alembic.ini             ← Alembic configuration
├── db/
│   ├── README.md           ← Schema overview & ER diagrams
│   └── alembic/
│       ├── env.py          ← Migration environment (loads SQLAlchemy Base)
│       ├── script.py.mako  ← Migration script template
│       └── versions/       ← Timestamped migration revision scripts
└── cdb/
    └── models/             ← Declarative SQLAlchemy models
```

---

## 2. Standard Workflow for Schema Changes

### Step 1: Update the SQLAlchemy Declarative Model
Modify or create models in `src/backend/cdb/models/` (e.g. `person.py`, `company.py`, `signal.py`, `intake.py`).
Ensure the model is exported in `src/backend/cdb/models/__init__.py` so Alembic `env.py` detects it.

### Step 2: Generate Migration Revision
From `src/backend`:

```bash
cd src/backend
uv run alembic revision --autogenerate -m "describe_the_change"
```

### Step 3: Inspect and Refine the Migration Script
Open the newly created file in `src/backend/db/alembic/versions/<revision_id>_describe_the_change.py`.
- Verify nullable constraints, column types, default values, and foreign keys (`ondelete="CASCADE"` vs `ondelete="SET NULL"`).
- Add explicit index names following naming conventions (`ix_<table>_<column>`).
- If adding a dimension table or seed data, include bulk inserts or upserts using `op.bulk_insert()`.

### Step 4: Apply Migration Locally
```bash
uv run alembic upgrade head
```

### Step 5: Verify Rollback (Downgrade)
Ensure the `downgrade()` function cleanly reverses the upgrade:
```bash
uv run alembic downgrade -1
uv run alembic upgrade head
```

---

## 3. Dimension Table Seeding Pattern

Dimension tables (`person_actions`, `opportunity_actions`, `signals`) define immutable business taxonomies and lookups:

- Do NOT manually edit raw SQL dumps.
- Always implement an idempotent seed function in the service layer (e.g. `ensure_signals_dimension(db)` in `src/backend/cdb/services/signals/catalog/`), called during application startup or within the migration.

---

## 4. Key CLI Commands

| Action | Command (run from `src/backend/`) |
|--------|-----------------------------------|
| Current database revision | `uv run alembic current` |
| View revision history | `uv run alembic history --verbose` |
| Generate autocommit revision | `uv run alembic revision --autogenerate -m "..."` |
| Apply all pending migrations | `uv run alembic upgrade head` |
| Rollback last migration | `uv run alembic downgrade -1` |
| Stamp head without running | `uv run alembic stamp head` |

---

## 5. References

- Models directory: [`src/backend/cdb/models/`](../../src/backend/cdb/models/)
- Alembic versions: [`src/backend/db/alembic/versions/`](../../src/backend/db/alembic/versions/)
- Schema documentation: [`src/backend/db/README.md`](../../src/backend/db/README.md)
