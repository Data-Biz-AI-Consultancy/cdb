---
name: cdb-database-ops
description: >-
  Use this skill for database operations in CDB, such as cloning production PostgreSQL
  data to local dev using `clone_prod_to_dev.sh`, inspecting row counts across entities,
  managing Docker PostgreSQL containers, or executing safe data backups and resets.
---

# CDB Database Operations & Cloning Runbook

This guide covers operational tasks for CDB's PostgreSQL database.

---

## 1. Cloning Production DB to Dev (`clone_prod_to_dev.sh`)

Script location: [`scripts/clone_prod_to_dev.sh`](../../scripts/clone_prod_to_dev.sh)

The utility automates a safe `pg_dump` and `psql` restore from production to your local/dev database container.

### Common Usage Examples

```bash
# 1. Standard run using auto-detected IP/URL from .env
./scripts/clone_prod_to_dev.sh

# 2. Explicit production IP or database URL
./scripts/clone_prod_to_dev.sh --prod-ip "192.168.178.164"
./scripts/clone_prod_to_dev.sh --prod-url "postgresql://cdb:secret@prod.cdb.internal:5432/cdb"

# 3. Pull via remote SSH and Docker
./scripts/clone_prod_to_dev.sh --ssh-host "deploy@vps.cdb.internal"

# 4. Dry-run inspection (checks connectivity without modifying DB)
./scripts/clone_prod_to_dev.sh --dry-run

# 5. Non-interactive execution for automated scripts
./scripts/clone_prod_to_dev.sh -y
```

### Safety Features
- **Production URL Guard**: Aborts immediately if the destination URL contains `prod`, `production`, or a known production hostname unless `--override-safety-check` is explicitly passed.
- **Pre-restore Confirmation**: Prompts the user with table summary before executing drops.
- **Docker Fallback**: Automatically invokes PostgreSQL inside Docker containers if local `pg_dump`/`psql` binaries are not present on the host.

---

## 2. Local Database Lifecycle

### Starting the PostgreSQL Database Container
```bash
docker compose up -d db
```

### Direct Database Connection via CLI
```bash
# Via Docker exec
docker compose exec -it db psql -U cdb -d cdb

# Via local psql (dev default port 5433)
psql -h localhost -p 5433 -U cdb -d cdb
```

### Checking Table Row Counts
```sql
SELECT
  relname AS table_name,
  n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```
