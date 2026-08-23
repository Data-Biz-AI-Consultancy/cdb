# CDB Data Migration Scripts

This directory contains migration utilities and operational scripts for CDB.

## `migrate_cdp_to_cdb.py`

Migrates historical and live records from Jager's PostgreSQL `cdp` database (port 5432, database `cdp`, schema `cdp` or `public`) into CDB's PostgreSQL `cdb` database (port 5433, database `cdb`, schema `public`).

### Features:
- **Dependency-ordered execution**: Companies -> Persons -> PCRs -> Intake Tables -> Activities -> Leads.
- **Idempotency**: Safe to re-run; uses upserts / conflict checking to prevent duplicate creation.
- **Traceability**: Saves original Jager UUID in JSONB `attributes->'jager_origin_id'`.
- **Dry-run mode**: Simulates full extraction, transformation, and ID mapping without writing to target database.
- **Validation mode**: Queries target CDB tables for row counts and FK consistency.

---

### Usage

#### 1. Dry Run Simulation
```bash
python scripts/migrate_cdp_to_cdb.py --dry-run \
  --source-url "postgresql://jager:jager@localhost:5432/cdp" \
  --target-url "postgresql://cdb:cdb@localhost:5433/cdb"
```

#### 2. Execute Migration
```bash
python scripts/migrate_cdp_to_cdb.py \
  --source-url "postgresql://jager:jager@localhost:5432/cdp" \
  --target-url "postgresql://cdb:cdb@localhost:5433/cdb"
```

Environment variables can also be used:
```bash
export JAGER_DATABASE_URL="postgresql://jager:jager@localhost:5432/cdp"
export DATABASE_URL="postgresql://cdb:cdb@localhost:5433/cdb"
python scripts/migrate_cdp_to_cdb.py
```

#### 3. Post-Migration Validation
```bash
python scripts/migrate_cdp_to_cdb.py --validate-only \
  --target-url "postgresql://cdb:cdb@localhost:5433/cdb"
```

---

### Rollback Plan
Since CDB operates on an independent database (`cdb`), rollback is risk-free:
1. Re-create the CDB database: `DROP DATABASE cdb; CREATE DATABASE cdb;`
2. Apply Alembic migrations: `uv run alembic upgrade head`
3. Re-run migration script.

Jager's source database (`cdp`) is only accessed in read mode and is never modified.
