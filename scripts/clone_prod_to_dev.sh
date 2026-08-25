#!/usr/bin/env bash
# ==============================================================================
# CDB — Production to Development Database Clone Script
# ==============================================================================
# Copies data from production CDB PostgreSQL database to local/development DB.
# Automatically detects and uses local PostgreSQL client tools or falls back to
# Docker containers seamlessly.
#
# Usage:
#   ./scripts/clone_prod_to_dev.sh [OPTIONS]
#
# Examples:
#   # Direct connection via URLs:
#   ./scripts/clone_prod_to_dev.sh --prod-url "postgresql://user:pass@prod-host:5432/cdb"
#
#   # Using SSH to pull from remote production server docker container:
#   ./scripts/clone_prod_to_dev.sh --ssh-host "deploy@vps.cdb.internal"
#
#   # Non-interactive mode into local dev docker container:
#   ./scripts/clone_prod_to_dev.sh --prod-url "$PROD_DATABASE_URL" -y
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# Styling & Colors
# ------------------------------------------------------------------------------
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}${BOLD}[INFO]${NC} $*"
}

success() {
    echo -e "${GREEN}${BOLD}[SUCCESS]${NC} $*"
}

warn() {
    echo -e "${YELLOW}${BOLD}[WARNING]${NC} $*"
}

error() {
    echo -e "${RED}${BOLD}[ERROR]${NC} $*" >&2
}

fatal() {
    error "$*"
    exit 1
}

# ------------------------------------------------------------------------------
# Script Defaults & Environment Loading
# ------------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Helper to safely extract keys from .env (even with dashes like prod-url)
get_env_val() {
    local key="$1"
    local env_file="${REPO_ROOT}/.env"
    if [[ -f "${env_file}" ]]; then
        grep -E "^[[:space:]]*${key}[[:space:]]*=" "${env_file}" 2>/dev/null \
            | head -n 1 \
            | sed -E 's/^[[:space:]]*[^=]+=[[:space:]]*//; s/^["'"'"']//; s/["'"'"'][[:space:]]*$//' \
            | tr -d '\r' || true
    fi
}

# Safely load valid bash environment variables from .env
if [[ -f "${REPO_ROOT}/.env" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
        [[ -z "$line" || "$line" =~ ^# ]] && continue
        if [[ "$line" =~ ^[a-zA-Z_][a-zA-Z0-9_]*= ]]; then
            eval "export $line" 2>/dev/null || true
        fi
    done < "${REPO_ROOT}/.env"
fi

# Production database connection parameters
PROD_DB_USER="${PROD_DB_USER:-${POSTGRES_USER:-cdb}}"
PROD_DB_PASSWORD="${PROD_DB_PASSWORD:-${POSTGRES_PASSWORD:-cdb}}"
PROD_DB_PORT="${PROD_DB_PORT:-5433}"
PROD_DB_NAME="${PROD_DB_NAME:-${POSTGRES_DB:-cdb}}"

# Resolve default production source from env or .env file
PROD_SOURCE="${PROD_DATABASE_URL:-}"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="${CDB_PROD_DB_URL:-}"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="${CDB_PROD_DATABASE_URL:-}"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="${PROD_URL:-}"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="${PROD_IP:-}"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="${PROD_HOST:-}"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="$(get_env_val "prod-url")"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="$(get_env_val "PROD_DATABASE_URL")"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="$(get_env_val "PROD_URL")"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="$(get_env_val "prod_url")"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="$(get_env_val "PROD_IP")"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="$(get_env_val "prod_ip")"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="$(get_env_val "PROD_HOST")"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="$(get_env_val "prod_host")"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="$(get_env_val "CDB_PROD_DB_URL")"
[[ -z "${PROD_SOURCE}" ]] && PROD_SOURCE="$(get_env_val "CDB_PROD_IP")"

normalize_pg_url() {
    local target="$1"
    local default_user="${2:-cdb}"
    local default_pass="${3:-cdb}"
    local default_port="${4:-5433}"
    local default_db="${5:-cdb}"

    if [[ -z "$target" ]]; then
        echo ""
        return
    fi

    if [[ "$target" =~ ^postgresql\+asyncpg:\/\/ ]]; then
        target="postgresql://${target#postgresql+asyncpg://}"
    fi

    if [[ "$target" =~ ^postgres(ql)?:\/\/ ]]; then
        echo "$target"
        return
    fi

    local host="$target"
    local port="$default_port"
    if [[ "$target" =~ ^([a-zA-Z0-9\.\-]+):([0-9]+)$ ]]; then
        host="${BASH_REMATCH[1]}"
        port="${BASH_REMATCH[2]}"
    fi

    echo "postgresql://${default_user}:${default_pass}@${host}:${port}/${default_db}"
}

PROD_URL="${PROD_SOURCE:-}"

# Default dev URL points to local CDB PostgreSQL instance (host port 5433)
DEV_URL="${DEV_DATABASE_URL:-${CDB_DEV_DB_URL:-${SYNC_DATABASE_URL:-postgresql://cdb:cdb@localhost:5433/cdb}}}"
DEV_URL="$(normalize_pg_url "${DEV_URL}" "cdb" "cdb" "5433" "cdb")"

SSH_HOST=""
SSH_CONTAINER="cdb-db"
SSH_PORT="22"
REMOTE_DB_USER="cdb"
REMOTE_DB_NAME="cdb"

CLEAN_TARGET=true
DATA_ONLY=false
ASSUME_YES=false
DRY_RUN=false
SAVE_DUMP_PATH=""
FORCE_DOCKER=false
OVERRIDE_SAFETY=false

# ------------------------------------------------------------------------------
# Help / Usage
# ------------------------------------------------------------------------------
show_help() {
    cat <<EOF
${BOLD}CDB — Production to Dev Database Clone Script${NC}

${BOLD}USAGE:${NC}
    ./scripts/clone_prod_to_dev.sh [OPTIONS]

${BOLD}OPTIONS:${NC}
    ${CYAN}-p, --prod-url, --prod-ip <VAL>${NC}
                                Production PostgreSQL connection URL or IP address
                                (default: auto-detected from .env prod-url / PROD_DATABASE_URL)
    ${CYAN}-d, --dev-url <URL>${NC}         Destination Dev PostgreSQL connection URL
                                (default: postgresql://cdb:cdb@localhost:5433/cdb)
    ${CYAN}--prod-port <PORT>${NC}        Production DB port if passing IP (default: 5433)
    ${CYAN}--prod-user <USER>${NC}        Production DB user if passing IP (default: cdb)
    ${CYAN}--prod-password <PASS>${NC}    Production DB password if passing IP (default: cdb)
    ${CYAN}--prod-db <NAME>${NC}          Production DB name if passing IP (default: cdb)
    ${CYAN}--ssh-host <USER@HOST>${NC}     Remote SSH host to dump from via remote docker
                                (e.g. root@vps.internal)
    ${CYAN}--ssh-container <NAME>${NC}    Remote database container name (default: cdb-db)
    ${CYAN}--ssh-port <PORT>${NC}          SSH port (default: 22)
    ${CYAN}--remote-db-user <USER>${NC}   Remote Postgres user for SSH dump (default: cdb)
    ${CYAN}--remote-db-name <DB>${NC}     Remote Postgres DB name for SSH dump (default: cdb)
    ${CYAN}--docker${NC}                   Force using Docker container for client operations
    ${CYAN}--no-clean${NC}                 Do not drop/recreate dev schema before restore
    ${CYAN}--data-only${NC}                Dump and restore table data only (no schema DDL)
    ${CYAN}--save-dump <PATH>${NC}         Save downloaded dump to specific file
    ${CYAN}-y, --yes, --force${NC}         Skip interactive confirmation prompts
    ${CYAN}--dry-run${NC}                  Print actions without executing
    ${CYAN}--override-safety-check${NC}    Bypass safety guard for target URL detection
    ${CYAN}-h, --help${NC}                 Show this help message

${BOLD}EXAMPLES:${NC}
    ${GREEN}# 1. Automatic run using default production IP from .env:${NC}
    ./scripts/clone_prod_to_dev.sh

    ${GREEN}# 2. Direct connection using explicit IP or URL:${NC}
    ./scripts/clone_prod_to_dev.sh --prod-ip "192.168.178.164"
    ./scripts/clone_prod_to_dev.sh --prod-url "postgresql://cdb:secret@db.prod.internal:5432/cdb"

    ${GREEN}# 3. Pulling via SSH from remote VPS container:${NC}
    ./scripts/clone_prod_to_dev.sh --ssh-host "deploy@vps.cdb.internal"

    ${GREEN}# 4. Non-interactive run into local dev container:${NC}
    ./scripts/clone_prod_to_dev.sh -y
EOF
}

# ------------------------------------------------------------------------------
# Parse Arguments
# ------------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        -p|--prod-url|--prod-ip|--prod-host)
            PROD_URL="$2"
            shift 2
            ;;
        --prod-port)
            PROD_DB_PORT="$2"
            shift 2
            ;;
        --prod-user)
            PROD_DB_USER="$2"
            shift 2
            ;;
        --prod-password)
            PROD_DB_PASSWORD="$2"
            shift 2
            ;;
        --prod-db)
            PROD_DB_NAME="$2"
            shift 2
            ;;
        -d|--dev-url)
            DEV_URL="$2"
            shift 2
            ;;
        --ssh-host)
            SSH_HOST="$2"
            shift 2
            ;;
        --ssh-container)
            SSH_CONTAINER="$2"
            shift 2
            ;;
        --ssh-port)
            SSH_PORT="$2"
            shift 2
            ;;
        --remote-db-user)
            REMOTE_DB_USER="$2"
            shift 2
            ;;
        --remote-db-name)
            REMOTE_DB_NAME="$2"
            shift 2
            ;;
        --docker)
            FORCE_DOCKER=true
            shift
            ;;
        --no-clean)
            CLEAN_TARGET=false
            shift
            ;;
        --data-only)
            DATA_ONLY=true
            shift
            ;;
        --save-dump)
            SAVE_DUMP_PATH="$2"
            shift 2
            ;;
        -y|--yes|--force)
            ASSUME_YES=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --override-safety-check)
            OVERRIDE_SAFETY=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            fatal "Unknown option: $1 (run with --help for usage)"
            ;;
    esac
done

# Normalize production URL after flags have been parsed
if [[ -n "${PROD_URL}" ]]; then
    PROD_URL="$(normalize_pg_url "${PROD_URL}" "${PROD_DB_USER}" "${PROD_DB_PASSWORD}" "${PROD_DB_PORT}" "${PROD_DB_NAME}")"
fi

# ------------------------------------------------------------------------------
# Pre-flight Checks & Validation
# ------------------------------------------------------------------------------
if [[ -z "${PROD_URL}" && -z "${SSH_HOST}" ]]; then
    error "No production source specified."
    echo -e "Provide either ${CYAN}--prod-url <URL>${NC} (or ${CYAN}PROD_DATABASE_URL${NC} in .env) or ${CYAN}--ssh-host <USER@HOST>${NC}."
    echo -e "Run with ${CYAN}--help${NC} for full usage instructions."
    exit 1
fi

# Sanitize connection URLs for logging (hide password)
mask_url() {
    local raw="$1"
    if [[ "$raw" =~ ://([^:]+):([^@]+)@ ]]; then
        echo "$raw" | sed -E 's/:\/\/([^:]+):([^@]+)@/:\/\/\1:****@/'
    else
        echo "$raw"
    fi
}

MASKED_PROD_URL="$(mask_url "${PROD_URL:-}")"
MASKED_DEV_URL="$(mask_url "${DEV_URL}")"

# ------------------------------------------------------------------------------
# Target Safety Guard
# ------------------------------------------------------------------------------
if [[ "${OVERRIDE_SAFETY}" == "false" ]]; then
    DEV_LOWER="$(echo "${DEV_URL}" | tr '[:upper:]' '[:lower:]')"
    if [[ "${DEV_LOWER}" =~ (production|prod-db|rds.amazonaws.com|supabase.co|neon.tech|cockroachlabs.cloud) ]] && [[ ! "${DEV_LOWER}" =~ (localhost|127\.0\.0\.1|host\.docker\.internal|cdb-db) ]]; then
        fatal "SAFETY ABORT: Destination URL looks like a production database (${MASKED_DEV_URL}). If this is intentional, pass --override-safety-check."
    fi
fi

# ------------------------------------------------------------------------------
# Tool Availability & Docker Fallback Resolution
# ------------------------------------------------------------------------------
HAVE_PG_DUMP=false
HAVE_PSQL=false
HAVE_DOCKER=false

if command -v pg_dump >/dev/null 2>&1 && [[ "${FORCE_DOCKER}" == "false" ]]; then
    HAVE_PG_DUMP=true
fi

if command -v psql >/dev/null 2>&1 && [[ "${FORCE_DOCKER}" == "false" ]]; then
    HAVE_PSQL=true
fi

if command -v docker >/dev/null 2>&1; then
    HAVE_DOCKER=true
fi

if [[ -n "${SSH_HOST}" ]]; then
    command -v ssh >/dev/null 2>&1 || fatal "Required tool 'ssh' is not installed or not in PATH."
fi

if [[ "${HAVE_PG_DUMP}" == "false" && -z "${SSH_HOST}" && "${HAVE_DOCKER}" == "false" ]]; then
    fatal "Neither 'pg_dump' nor 'docker' is available. Please install postgresql-client (libpq) or Docker."
fi

if [[ "${HAVE_PSQL}" == "false" && "${HAVE_DOCKER}" == "false" ]]; then
    fatal "Neither 'psql' nor 'docker' is available. Please install postgresql-client (libpq) or Docker."
fi

# Check if local cdb-db container is active
IS_LOCAL_CDB_CONTAINER_RUNNING=false
if [[ "${HAVE_DOCKER}" == "true" ]]; then
    if docker ps --format '{{.Names}}' | grep -q "^cdb-db$"; then
        IS_LOCAL_CDB_CONTAINER_RUNNING=true
    fi
fi

# ------------------------------------------------------------------------------
# Helper execution functions
# ------------------------------------------------------------------------------
run_pg_dump() {
    local conn_url="$1"
    shift
    if [[ "${HAVE_PG_DUMP}" == "true" ]]; then
        pg_dump "${conn_url}" "$@"
    elif [[ "${HAVE_DOCKER}" == "true" ]]; then
        docker run --rm -i --network host postgres:16 pg_dump "${conn_url}" "$@"
    else
        fatal "No method available to run pg_dump."
    fi
}

run_psql_cmd() {
    local query="$1"
    if [[ "${IS_LOCAL_CDB_CONTAINER_RUNNING}" == "true" && ("${DEV_URL}" =~ localhost:5433 || "${DEV_URL}" =~ 127\.0\.0\.1:5433 || "${DEV_URL}" =~ cdb-db:5432) ]]; then
        docker exec -i cdb-db psql -U cdb -d cdb -v ON_ERROR_STOP=1 -c "${query}"
    elif [[ "${HAVE_PSQL}" == "true" ]]; then
        psql "${DEV_URL}" -v ON_ERROR_STOP=1 -c "${query}"
    elif [[ "${HAVE_DOCKER}" == "true" ]]; then
        docker run --rm -i --network host postgres:16 psql "${DEV_URL}" -v ON_ERROR_STOP=1 -c "${query}"
    else
        fatal "No method available to run psql."
    fi
}

apply_psql_file() {
    local file_path="$1"
    if [[ "${IS_LOCAL_CDB_CONTAINER_RUNNING}" == "true" && ("${DEV_URL}" =~ localhost:5433 || "${DEV_URL}" =~ 127\.0\.0\.1:5433 || "${DEV_URL}" =~ cdb-db:5432) ]]; then
        docker exec -i cdb-db psql -U cdb -d cdb -v ON_ERROR_STOP=1 < "${file_path}"
    elif [[ "${HAVE_PSQL}" == "true" ]]; then
        psql "${DEV_URL}" -v ON_ERROR_STOP=1 < "${file_path}"
    elif [[ "${HAVE_DOCKER}" == "true" ]]; then
        docker run --rm -i --network host postgres:16 psql "${DEV_URL}" -v ON_ERROR_STOP=1 < "${file_path}"
    else
        fatal "No method available to apply SQL dump."
    fi
}

# ------------------------------------------------------------------------------
# Confirmation Summary
# ------------------------------------------------------------------------------
echo -e "${BOLD}======================================================================${NC}"
echo -e "${BOLD}  CDB Database Clone: Production ➔ Development${NC}"
echo -e "${BOLD}======================================================================${NC}"
if [[ -n "${SSH_HOST}" ]]; then
    echo -e "  ${BOLD}Source (SSH):${NC}        ${CYAN}${SSH_HOST}:${SSH_PORT}${NC} (container: ${SSH_CONTAINER}, db: ${REMOTE_DB_NAME})"
else
    echo -e "  ${BOLD}Source (URL):${NC}        ${CYAN}${MASKED_PROD_URL}${NC}"
fi

if [[ "${IS_LOCAL_CDB_CONTAINER_RUNNING}" == "true" && ("${DEV_URL}" =~ localhost:5433 || "${DEV_URL}" =~ 127\.0\.0\.1:5433 || "${DEV_URL}" =~ cdb-db:5432) ]]; then
    echo -e "  ${BOLD}Destination:${NC}         ${CYAN}Local Docker Container 'cdb-db' (${MASKED_DEV_URL})${NC}"
else
    echo -e "  ${BOLD}Destination:${NC}         ${CYAN}${MASKED_DEV_URL}${NC}"
fi

echo -e "  ${BOLD}Dump Tool:${NC}           $([[ -n "${SSH_HOST}" ]] && echo "SSH docker exec" || ([[ "${HAVE_PG_DUMP}" == "true" ]] && echo "host pg_dump" || echo "docker postgres:16"))"
echo -e "  ${BOLD}Restore Tool:${NC}        $([[ "${IS_LOCAL_CDB_CONTAINER_RUNNING}" == "true" && ("${DEV_URL}" =~ localhost:5433 || "${DEV_URL}" =~ 127\.0\.0\.1:5433) ]] && echo "docker exec cdb-db" || ([[ "${HAVE_PSQL}" == "true" ]] && echo "host psql" || echo "docker postgres:16"))"
echo -e "  ${BOLD}Clean Dev Target:${NC}    ${CLEAN_TARGET}"
echo -e "  ${BOLD}Data Only:${NC}           ${DATA_ONLY}"
echo -e "  ${BOLD}Dry Run:${NC}             ${DRY_RUN}"
echo -e "${BOLD}======================================================================${NC}"

if [[ "${DRY_RUN}" == "true" ]]; then
    info "Dry-run mode active. Verification complete, no data copied."
    exit 0
fi

if [[ "${ASSUME_YES}" == "false" ]]; then
    echo -e "${YELLOW}${BOLD}WARNING:${NC} This will overwrite data in the target development database."
    read -rp "Are you sure you want to proceed? [y/N] " confirm
    if [[ ! "${confirm}" =~ ^[yY]([eE][sS])?$ ]]; then
        info "Operation cancelled by user."
        exit 0
    fi
fi

# ------------------------------------------------------------------------------
# Temp Dump File Management
# ------------------------------------------------------------------------------
START_TIME=$(date +%s)
TEMP_DIR="$(mktemp -d)"
DUMP_FILE="${SAVE_DUMP_PATH:-${TEMP_DIR}/cdb_prod_dump_$(date +%Y%m%d_%H%M%S).sql}"

cleanup() {
    if [[ -z "${SAVE_DUMP_PATH}" && -d "${TEMP_DIR}" ]]; then
        rm -rf "${TEMP_DIR}"
    fi
}
trap cleanup EXIT

# ------------------------------------------------------------------------------
# Step 1: Dump from Production
# ------------------------------------------------------------------------------
info "Step 1/3: Extracting dump from Production..."

DUMP_FLAGS=(
    "--no-owner"
    "--no-privileges"
    "--quote-all-identifiers"
)

if [[ "${DATA_ONLY}" == "true" ]]; then
    DUMP_FLAGS+=("--data-only")
fi

if [[ -n "${SSH_HOST}" ]]; then
    info "Running pg_dump via SSH on ${SSH_HOST} inside container ${SSH_CONTAINER}..."
    ssh -p "${SSH_PORT}" "${SSH_HOST}" "docker exec -i ${SSH_CONTAINER} pg_dump -U ${REMOTE_DB_USER} -d ${REMOTE_DB_NAME} ${DUMP_FLAGS[*]}" > "${DUMP_FILE}"
else
    info "Running pg_dump against remote database..."
    run_pg_dump "${PROD_URL}" "${DUMP_FLAGS[@]}" > "${DUMP_FILE}"
fi

DUMP_SIZE=$(wc -c < "${DUMP_FILE}" | tr -d ' ')
DUMP_SIZE_HUMAN=$(du -h "${DUMP_FILE}" | cut -f1)
success "Production dump complete (${DUMP_SIZE_HUMAN}, ${DUMP_SIZE} bytes)."

# ------------------------------------------------------------------------------
# Step 2: Prepare & Restore into Development Target
# ------------------------------------------------------------------------------
info "Step 2/3: Restoring into Development target..."

if [[ "${CLEAN_TARGET}" == "true" && "${DATA_ONLY}" == "false" ]]; then
    info "Resetting public schema in target development database..."
    run_psql_cmd "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO CURRENT_USER;" > /dev/null
fi

info "Applying SQL dump to development database..."
apply_psql_file "${DUMP_FILE}" > /dev/null

success "Database restore completed successfully."

# ------------------------------------------------------------------------------
# Step 3: Verification & Row Counts
# ------------------------------------------------------------------------------
info "Step 3/3: Verifying migrated data..."

VALIDATION_SQL="
SELECT 'persons'                      AS table_name, COUNT(*)::text AS count FROM persons
UNION ALL
SELECT 'companies',                                  COUNT(*)::text FROM companies
UNION ALL
SELECT 'person_company_relationships',              COUNT(*)::text FROM person_company_relationships
UNION ALL
SELECT 'activities',                                COUNT(*)::text FROM activities
UNION ALL
SELECT 'leads',                                     COUNT(*)::text FROM leads
UNION ALL
SELECT 'opportunities',                             COUNT(*)::text FROM opportunities
UNION ALL
SELECT 'intake_linkedin_connections',               COUNT(*)::text FROM intake_linkedin_connections
UNION ALL
SELECT 'intake_linkedin_messages',                  COUNT(*)::text FROM intake_linkedin_messages
UNION ALL
SELECT 'intake_notion_meeting_notes',               COUNT(*)::text FROM intake_notion_meeting_notes;
"

echo -e "\n${BOLD}--- Migrated Table Row Counts ---${NC}"
run_psql_cmd "${VALIDATION_SQL}"

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

if [[ -n "${SAVE_DUMP_PATH}" ]]; then
    info "Dump file saved to: ${SAVE_DUMP_PATH}"
fi

echo -e "\n${GREEN}${BOLD}✓ Production to Dev clone completed in ${ELAPSED}s.${NC}\n"
