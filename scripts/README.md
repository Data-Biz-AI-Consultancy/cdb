# CDB Operational Scripts

This directory contains operational utilities and maintenance scripts for CDB.

---

## 📋 Available Scripts

### `clone_prod_to_dev.sh`

Automated, safe utility to clone the production PostgreSQL database into your local or development database environment.

#### Features
- **Flexible Source Modes**: Supports direct PostgreSQL connection URLs or remote SSH dumping via Docker.
- **Automatic Fallback**: Uses host `pg_dump`/`psql` binaries if present, or automatically executes within standard `postgres:16` / `cdb-db` Docker containers.
- **Safety Guard**: Prevents accidental overwrites if the target URL looks like a production database.
- **Schema Reset & Re-sync**: Drops and recreates the development `public` schema before applying dumps (disable with `--no-clean` or use `--data-only`).
- **Post-Clone Validation**: Displays table row count summary across all core entities (`persons`, `companies`, `activities`, `leads`, `opportunities`, `intake_*`).

#### Usage & Examples

```bash
# 1. Direct connection using CLI option or PROD_DATABASE_URL from .env
./scripts/clone_prod_to_dev.sh --prod-url "postgresql://cdb:secret@prod.cdb.internal:5432/cdb"

# 2. Pulling from a remote VPS container over SSH
./scripts/clone_prod_to_dev.sh --ssh-host "deploy@vps.cdb.internal"

# 3. Non-interactive execution (skips confirmation prompt)
./scripts/clone_prod_to_dev.sh -p "$PROD_DATABASE_URL" -y

# 4. Dry-run inspection
./scripts/clone_prod_to_dev.sh --dry-run
```

#### CLI Options
| Flag | Description | Default |
|------|-------------|---------|
| `-p`, `--prod-url <URL>` | Production PostgreSQL connection URL | `$PROD_DATABASE_URL` |
| `-d`, `--dev-url <URL>` | Destination Dev PostgreSQL connection URL | `postgresql://cdb:cdb@localhost:5433/cdb` |
| `--ssh-host <USER@HOST>` | Remote SSH host to dump from via remote Docker | — |
| `--ssh-container <NAME>` | Remote database container name | `cdb-db` |
| `--ssh-port <PORT>` | SSH port | `22` |
| `--docker` | Force Docker container execution | `false` |
| `--no-clean` | Do not reset dev schema before restore | `false` |
| `--data-only` | Dump and restore table data only (no schema DDL) | `false` |
| `--save-dump <PATH>` | Save dump SQL to a specific file | Temporary file |
| `-y`, `--yes`, `--force` | Skip interactive confirmation | `false` |
| `--dry-run` | Print parameters and test without copying data | `false` |
| `--override-safety-check` | Bypass safety guard for destination URL | `false` |
| `-h`, `--help` | Show help message | — |
