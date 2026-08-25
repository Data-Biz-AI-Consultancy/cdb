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
# 1. Automatic run using default production IP/URL from .env (e.g. prod-url=192.168.178.164)
./scripts/clone_prod_to_dev.sh

# 2. Direct connection using explicit IP or PostgreSQL URL
./scripts/clone_prod_to_dev.sh --prod-ip "192.168.178.164"
./scripts/clone_prod_to_dev.sh --prod-url "postgresql://cdb:secret@prod.cdb.internal:5432/cdb"

# 3. Pulling from a remote VPS container over SSH
./scripts/clone_prod_to_dev.sh --ssh-host "deploy@vps.cdb.internal"

# 4. Non-interactive execution (skips confirmation prompt)
./scripts/clone_prod_to_dev.sh -y

# 5. Dry-run inspection
./scripts/clone_prod_to_dev.sh --dry-run
```

#### CLI Options
| Flag | Description | Default |
|------|-------------|---------|
| `-p`, `--prod-url`, `--prod-ip <VAL>` | Production PostgreSQL connection URL or IP address | Auto-detected from `.env` (`prod-url`, `PROD_DATABASE_URL`, `PROD_IP`, etc.) |
| `-d`, `--dev-url <URL>` | Destination Dev PostgreSQL connection URL | `postgresql://cdb:cdb@localhost:5433/cdb` |
| `--prod-port <PORT>` | Production DB port when passing IP | `5433` |
| `--prod-user <USER>` | Production DB user when passing IP | `cdb` |
| `--prod-password <PASS>` | Production DB password when passing IP | `cdb` |
| `--prod-db <NAME>` | Production DB name when passing IP | `cdb` |
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

