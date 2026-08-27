# CDB — Client DataBase

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-3776AB.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://postgresql.org)

**CDB (Client DataBase)** is an open-source, AI & ML-native, self-hosted personal CRM and Customer Data Platform (CDP) designed to give professionals a single, unified view of everyone they know — across all channels and tools.

---

## 🌟 Key Capabilities

- **AI & ML Native**: Built from the ground up for intelligent automation — featuring ML-driven probabilistic entity resolution, smart deduplication, automated intent detection, and continuous learning from user reviews.
- **Unified Identity**: Merges disparate person profiles across LinkedIn, Notion meeting notes, emails, and spreadsheets into a single golden record.
- **Hybrid Entity Resolution**: Deterministic rule-based matching with interactive candidate review queues and probabilistic ML scoring.
- **First-Class Peer Entities**: Persons and Companies are peers linked by rich relationship histories (`person_company_relationships`).
- **Interaction & Deal Tracking**: Chronological activity logs (meetings, messages, calls) and an opportunity pipeline with stage tracking.
- **Zero Lock-In & Self-Hostable**: 1-command setup with Docker Compose. Your data stays entirely in your own PostgreSQL instance.

---

## 🏗️ Architecture & Domain Model

```
Directory (Identities & Peer Entities)
Persons ─────────────────────────────── Companies
    │         person_company_relationships   │
    │              (many-to-many)            │
    │                                        │
Pipeline & Engagements (CRM Lifecycle)       │
    ├── Activities ──────────────────────────┤
    │   (meetings, emails, messages, calls)  │
    │                                        │
    ├── Leads ───────────────────────────────┤
    │   (qualification & job signals)        │
    │                                        │
    ├── Opportunities ───────────────────────┤
    │   (deals, pipeline & proposals)        │
    │                                        │
    └── Engagements ─────────────────────────┘
        (active jobs & client delivery)
```

---

## 🚀 Quick Start (Docker Compose)

### 1. Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- Git

### 2. Launch Services
```bash
# Clone the repository
git clone https://github.com/data-biz-ai-consultancy/cdb.git
cd cdb

# Copy environment configuration
cp .env.example .env

# Start all services
docker compose up -d
```

### 3. Verify & Access
- **Web UI / Frontend**: [http://localhost:3001](http://localhost:3001)
- **API Base**: [http://localhost:8000](http://localhost:8000)
- **Interactive OpenAPI Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**:
  ```bash
  curl http://localhost:8000/healthz
  ```

---

## 🔌 Port Allocation

To prevent collisions when co-hosted with existing stacks (such as Jager on port 5432):

| Service | Container Port | Host Port | Description |
|---------|----------------|-----------|-------------|
| `cdb-frontend` | `3000` | `3001` | Next.js Web UI |
| `cdb-api` | `8000` | `8000` (or `8001`) | FastAPI Application Server |
| `cdb-db` | `5432` | `5433` | PostgreSQL 16 Database |
| `cdb-redis` | `6379` | `6380` | Redis 7 Task & Cache Broker |
| `cdb-worker` | — | — | Celery Background Worker |

---

## 💻 Local Development (Without Docker)

### 1. Environment Setup
```bash
cd src/backend

# Create virtual environment and install dependencies with development tools
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"
```

### 2. Database Migrations
Ensure PostgreSQL and Redis are running (or start only DB/Redis via `docker compose up -d cdb-db cdb-redis`), then run:
```bash
alembic -c src/backend/db/alembic.ini upgrade head
```

### 3. Run FastAPI with Live Reload
```bash
uvicorn cdb.main:app --reload --port 8000
```

### 4. Run Celery Worker
```bash
celery -A cdb.workers.celery_app worker --loglevel=info
```

---

## 🧪 Testing

### Backend Tests & Linting
```bash
# Run pytest test suite
pytest -v

# Run linter
ruff check .
```

### Frontend Tests & Type Checking
```bash
cd src/frontend

# Run vitest test suite
npm test

# Run TypeScript typecheck
npm run typecheck
```

---

## 🔄 Database Cloning (Production → Dev)

To copy live production data into your local development database:

```bash
# Direct connection (reads PROD_DATABASE_URL from .env if present):
./scripts/clone_prod_to_dev.sh --prod-url "postgresql://cdb:secret@db.prod.internal:5432/cdb"

# Pulling via SSH from remote VPS container:
./scripts/clone_prod_to_dev.sh --ssh-host "deploy@vps.cdb.internal"

# Dry run / inspection:
./scripts/clone_prod_to_dev.sh --dry-run
```

See [scripts/README.md](scripts/README.md) for the complete list of options and safety guards.

---

## 📁 Repository Structure

```
cdb/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Staging CI build & tests on push to main
│       └── release.yml            # Manual production release promotion workflow
├── scripts/
│   ├── clone_prod_to_dev.sh       # Production to dev database clone utility
│   └── README.md                  # Operational scripts documentation
├── src/
│   ├── backend/                   # Python FastAPI Backend
│   │   ├── cdb/                   # Core application package
│   │   │   ├── api/               # API routers and dependencies
│   │   │   │   ├── deps.py        # JWT and API Key dependencies
│   │   │   │   └── v1/            # Versioned endpoints
│   │   │   ├── core/              # Security, config, error handling, DB session
│   │   │   ├── models/            # SQLAlchemy 2.x async ORM models
│   │   │   ├── schemas/           # Pydantic v2 schemas
│   │   │   ├── services/          # Business logic (ER engine, Ingestion)
│   │   │   └── workers/           # Celery worker configuration
│   │   ├── db/                    # Database migrations
│   │   │   ├── alembic/
│   │   │   │   └── versions/
│   │   │   └── alembic.ini
│   │   ├── tests/                 # Pytest test suite (backend)
│   │   ├── Dockerfile
│   │   └── pyproject.toml
│   └── frontend/                  # Next.js 15 App Router Frontend
│       ├── src/
│       │   ├── app/               # Page routes (persons, companies, activities, etc.)
│       │   ├── components/        # Shared navigation & layout UI components
│       │   ├── lib/               # API client and auth token storage
│       │   └── test/              # Vitest setup & DOM polyfills
│       ├── Dockerfile
│       ├── package.json
│       └── vitest.config.ts
├── docs/                          # Architecture & design specifications
├── docker-compose.yml
├── .env.example
├── README.md
└── LICENSE
```

---

## 📖 Documentation Index

| Document | Purpose |
|----------|---------|
| [PRD.md](docs/PRD.md) | Product vision, personas, core requirements, and roadmap |
| [Implementation_plan.md](docs/Implementation_plan.md) | Architecture blueprint, tech stack, and module design |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Authoritative PostgreSQL 16 schema reference (all 14 tables) |
| [API_SPEC.md](docs/API_SPEC.md) | REST API contracts, envelopes, and authentication specifications |
| [ENTITY_RESOLUTION_SPEC.md](docs/ENTITY_RESOLUTION_SPEC.md) | Normalization rules, matching hierarchy, and merge precedence |
| [JAGER_INTEGRATION.md](docs/JAGER_INTEGRATION.md) | Jager n8n integration, service auth, and deployment model |
| [DATA_MIGRATION.md](docs/DATA_MIGRATION.md) | Live migration plan from legacy Jager CDP tables to CDB |

---

## 🗺️ Roadmap
 
- [x] **Phase 0 — Foundation & Architecture Skeleton**
  - Async SQLAlchemy 2.0 schema for all 14 tables & initial Alembic migration
  - JWT Bearer auth (`/auth/*`) & Service API Key dependency (`X-API-Key`)
  - Standard error handling and pagination envelopes
  - Docker Compose multi-service dev environment & CI/CD workflows
- [x] **Phase 1 — Core Backend & Ingestion**
  - Full CRUD routes for Persons, Companies, Relationships, Activities, Leads, Opportunities
  - Rule-based Entity Resolution engine and Review Queue endpoints
  - Ingestion endpoints for LinkedIn, Notion, and CSV imports
  - Test suites covering auth, CRUD, errors, and ER rules
- [x] **Phase 2 — Categorized Frontend Experience** (Next.js 15 App Router)
  - Grouped navigation & dashboard (**Directory**, **Pipeline & Engagements**, **Settings**)
  - Unified views for Persons, Companies, Entity Resolution review queue
  - Full pipeline tracking for Activities, Leads, Opportunities, and active Client Engagements
  - Data ingestion test portal and System & Platform Settings
- [ ] **Phase 3 — ML Entity Resolution & Enriched Channels** (Gmail, Calendar)
- [ ] **Phase 4 — Segments, Advanced Integrations & RBAC**

---

## 🏷️ Releases & Versioning

This repository uses [Semantic Release](https://github.com/semantic-release/semantic-release) and [Conventional Commits](https://www.conventionalcommits.org/) for automated version management and changelog generation.

### Commit Conventions
All commit messages to `main` must follow conventional commit specifications:
- `fix:` -> Triggers a **PATCH** release (e.g., `v0.1.1`)
- `feat:` -> Triggers a **MINOR** release (e.g., `v0.2.0`)
- `feat!:`, `fix!:`, or `BREAKING CHANGE:` -> Triggers a **MAJOR** release (e.g., `v1.0.0`)
- `docs:`, `chore:`, `style:`, `refactor:`, `test:` -> No release triggered.

Automated releases update `CHANGELOG.md`, update versions in `pyproject.toml` and `package.json`, create a GitHub Release with tags (e.g. `v0.1.0`), and publish versioned Docker images to GitHub Container Registry (GHCR):
- Backend: `ghcr.io/<org>/cdb-backend:v<version>`, `ghcr.io/<org>/cdb-backend:latest`, `ghcr.io/<org>/cdb-backend:production`
- Frontend: `ghcr.io/<org>/cdb-frontend:v<version>`, `ghcr.io/<org>/cdb-frontend:latest`, `ghcr.io/<org>/cdb-frontend:production`

---

## 📄 License

Distributed under the **Apache 2.0** License. See [LICENSE](LICENSE) for details.
