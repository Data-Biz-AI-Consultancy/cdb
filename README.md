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

## 🎯 Product Vision & Design Principles

> **Vision**: Give every professional — from solo consultants to growing teams — the same depth of customer intelligence and relationship context that enterprise CRMs provide, without the cost, vendor lock-in, or manual entry fatigue.

1. **People-First Data Model**: The individual person is the primary unit of relationship value, not an ephemeral lead or deal ticket.
2. **Source-Agnostic Ingestion**: Ingest seamlessly from LinkedIn exports, Notion meeting notes, spreadsheets, and emails without being locked into proprietary formats.
3. **Transparent & Auditable ER**: Entity resolution decisions are visible and directly reviewable side-by-side by the user rather than hidden in a black box.
4. **Data Sovereignty & Privacy**: 100% self-hostable with Docker Compose. Your data, identity mappings, and contact records never leave your own PostgreSQL database.
5. **Grows With Your Team**: Engineered for solo use today, boutique consultancies tomorrow, and multi-user mid-market teams as you scale.

---

## 👥 Target Personas & Use Cases

* **Solo Professional & Consultant**:
  - *Challenge*: Contacts scattered across LinkedIn exports, email threads, and meeting notes; forgetting past context or missing timely follow-ups.
  - *Solution*: One-click ingestion, automatic cross-source deduplication, unified profile history, and consolidated interaction logs.
* **Boutique Teams & Consultancies (3–15 people)**:
  - *Challenge*: Multiple teammates tracking the same contact across disconnected spreadsheets without a shared pipeline.
  - *Solution*: Shared team-wide directory, unified company relationship graphs, collaborative deal pipeline, and active client engagement delivery tracking.
* **Growth & Mid-Market Organizations (50–500 FTE)**:
  - *Challenge*: Enterprise CRMs are rigid, expensive, and require tedious manual entry.
  - *Solution*: API-first ingestion, high-speed rule & ML entity resolution, clean architecture, and PostgreSQL 16 database portability.

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
    ├── Engagements ─────────────────────────┤
    │   (active jobs & client delivery)      │
    │                                        │
    └── Signals Radar ───────────────────────┘
        (opportunity & risk detection triage)
```

---

## 🔄 Core Product Workflows & Capabilities

### 1. Unified Person Golden Records & Audit Changelog (`person_history`)
* **Automatic Deduplication**: Merges contacts arriving across LinkedIn, Notion, and CSV imports into a single golden record.
* **Attribution & Provenance**: Inspect which sources contributed to each field with complete traceability (`source_ids` and `sources` tracking).
* **Career & Interaction Timelines**: Visualise employment histories (current & past roles) alongside chronological interaction feeds (LinkedIn messages, Notion meeting notes, emails, calls).
* **Full Audit Changelog & Action Dimensions (`person_history` & `person_actions`)**: Automated, immutable changelog tracking every profile update, segment re-evaluation, temperature shift, ER merge, career affiliation change, and bulk operation with field-level diffs (`old_value` → `new_value`).

### 2. Company Intelligence & Relationships
* **First-Class Peer Entities**: View company profiles with linked contacts, active employees, alumni, domain metadata, and linked pipeline deals.
* **Many-to-Many Graph**: Map complex affiliations where individuals consult for, advise, or lead multiple organizations simultaneously.

### 3. Lead Qualification to Opportunity Funnel & Interactive Kanban
* **Lead Lifecycle**: Track interest signals (`New` → `Contacted` → `Qualified` → `Converted` / `Disqualified`).
* **1-Click Conversion**: Promote qualified leads into active Opportunities while carrying over all person and company linkages.
* **Interactive Drag-and-Drop Kanban Board**: Advance deals across pipeline stages (`Prospect` → `Qualified` → `Proposal` → `Negotiation` → `Closed Won/Lost`) with HTML5 drag-and-drop, forecasting metrics (Active Pipeline, Confidence-Adjusted Weighted Value, Win Rate %), and automated Confidence Level adjustments.
* **Automated Staleness, Expiration & Overdue Warnings**: Inactive deals automatically get tagged as **Stale (30+ days inactive)** or **Expired (90+ days inactive)**. Active deals past their target close date are highlighted with prominent **🚨 Overdue ({days}d late)** badges and border accents. Quick filter buttons in the toolbar allow instant triage.
* **Title, Rich Description & Entity Linking**: First-class Title and multiline Description fields with easy management of attached Decision Makers, Champions, Influencers, and Organizations.
* **Full Audit History & Activity Timeline (`opportunity_history` & `opportunity_actions`)**: Track all stage shifts, deal adjustments, person/company affiliations, and custom meeting/call notes in an interactive chronological timeline.

### 4. Client Engagements, Contracts & Delivery Workspaces
* **Active Client Work**: Comprehensive tracking of ongoing consulting, retainer, and fractional engagements with existing client organizations.
* **Signed Contracts & Terms & Conditions**: First-class tracking of contract references (IDs, links, Notion docs), signed dates, contract status (`signed`, `draft`, `pending_signature`), and structured terms & conditions (T&Cs).
* **Flexible Billing & Rate Structures**: Support for daily, hourly, monthly retainer, or fixed-price billing models, currency, and total contract budget caps.
* **Connected Person Affiliations**: Link client leads, technical sponsors, stakeholders, and delivery leads to individual engagements with designated roles.
* **Integrated Meeting Notes & Activities**: Live feed of Notion meeting notes, calls, and email touchpoints tagged directly to the engagement.
* **Delivery Timeline & Countdown**: Real-time tracking of start dates, expected completion deadlines, days remaining, and overdue status alerts.

### 5. Entity Resolution & Review Queue
* **Deterministic Auto-Merge**: High-confidence exact matches (e.g. matching LinkedIn URL or verified primary email) auto-merge instantly.
* **Interactive Review Queue**: Ambiguous pairs surface in the UI for side-by-side comparison, allowing one-click **Accept Merge** or **Keep Separate**.

### 6. Opportunity & Risk Signal Catalog & Detection Engine (`signals` & `detected_signals`)
* **Standard Business Event Ontology**: Formal catalog stored in a dedicated PostgreSQL dimension table (`signals`) tracking 6 high-impact commercial events across the `Activities` → `Opportunities` pipeline.
* **Deterministic Classification Rules & Polarity**: Formal qualification criteria distinguishing expansion opportunities (`hiring_funding_event`, renewal window `expiring_contract`, executive join `leadership_change`) from relationship churn risks (`dormant_strategic_account`, `unanswered_conversation`, `competitor_signal`, champion departure `leadership_change`).
* **Confidence Scoring & Verification Triage**: Transparent scoring thresholds (High $\ge 0.80$, Medium $0.50-0.79$, Low $< 0.50$). Uncertain signals ($< 0.50$) are flagged with explicit rationale and isolated under the **Needs Verification** queue rather than presented as definitive.
* **Multi-Entity Conflict Detection**: Automated conflict detector flags contradictory polarities across Company (e.g. dormant account vs new funding), Opportunity (e.g. contract renewal vs competitor displacement), and Person (e.g. unanswered thread vs leadership change) scopes, preventing ill-informed outreach.
* **Intelligent Stateful Tagging (`detected_signals`)**: Bridge/fact table linking active signal events directly to Companies, Persons, Opportunities, Engagements, and triggering Activity evidence with structured JSON evidence contracts.
* **Automated Detection Engine**: Idempotent scanner detecting dormant accounts, expiring contracts, dropped conversation threads, leadership transitions, and competitor threats. Runs via on-demand API/UI sweeps as well as scheduled background execution via Celery Beat (every 6 hours).
* **Signals Radar & Detail Investigation Web UI (`/signals`, `/signals/[id]`)**: Fast, streamlined triage dashboard with minimal scannable cards on `/signals` featuring one-click status transitions (`Acknowledge`, `Take Action`, `Dismiss`), dedicated tabs (**All Active**, **⚠️ Conflicting Signals**, **🔍 Needs Verification**, **Signal Dimension Catalog**), and deep-dive investigation pages on `/signals/[id]` presenting full supporting evidence dossiers, multi-entity conflict analysis, uncertainty rationale, and playbook recommendations.

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

## 🔗 Jager Ecosystem & Automation Integration

CDB serves as the authoritative source of truth for identities, companies, and interaction data across the Jager ecosystem and automated workflow pipelines (e.g. n8n).

### 1. Deployment & Network Topology
* **Container Registry Distribution**: CDB Docker images are built and pushed to GitHub Container Registry (`ghcr.io/data-biz-ai-consultancy/cdb:production`) via automated release pipelines.
* **Internal Network Communication**: n8n and companion services call CDB over the shared Docker bridge network (`http://cdb-api:8000`).
* **Port Collision Avoidance**: PostgreSQL maps to host port `5433` to run harmoniously alongside existing Postgres instances on `5432`.

### 2. Service-to-Service Authentication
Background automation workflows authenticate using a dedicated service API key via the `X-API-Key` HTTP header:

```bash
# Automated ingestion payload example
curl -X POST http://localhost:8000/api/v1/ingest/linkedin-connections \
  -H "X-API-Key: ${CDB_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"records": [...]}'
```

### 3. Automated Ingestion Endpoints

| Ingestion Channel | Endpoint | Description |
| :--- | :--- | :--- |
| **LinkedIn Connections** | `POST /api/v1/ingest/linkedin-connections` | Ingests connection exports, names, company titles, and LinkedIn profile URLs. |
| **LinkedIn Messages** | `POST /api/v1/ingest/linkedin-messages` | Ingests message threads, timestamps, and conversation participants. |
| **Notion Meeting Notes** | `POST /api/v1/ingest/notion-meeting-notes` | Ingests meeting notes, attendee lists, summaries, and action items into Activities. |
| **Complete Backfill (1-Off / Sync)** | `POST /api/v1/ingest/backfill` | Backfills all unlinked LinkedIn companies, message threads, Notion notes, and recomputes segments. |
| **Manual & CSV Data** | `POST /api/v1/ingest/manual` | Ingests custom CSV/XLSX spreadsheets with dynamic column mappings. |

---

## 🔌 Native Data Connectors

CDB includes native background data connectors to synchronize external platform data directly without requiring intermediate ETL pipelines or orchestration tooling.

### Direct LinkedIn Connector

The direct LinkedIn connector interfaces with the LinkedIn Member Portability API using a unified dual-ingestion architecture:

1. **Static Historical Archive (`memberSnapshotData?domain=INBOX`)**:
   - Ingests full conversation thread histories and participant profiles.
2. **Live Rolling Stream (`memberChangeLogs?q=memberAndApplication`)**:
   - Continuously ingests real-time messages and interactions over the past 28 days.
   - Automatically infers contact names and links them against resolved contacts in `intake_linkedin_connections`.
3. **Timestamp Fidelity & Self-Healing**:
   - Computes `last_sent_at = MAX(sent_at)` for every thread and persists the authentic message datetime directly into `Activity.occurred_at` (preventing bulk insertion timestamps like `now()`).
   - Re-syncing automatically heals previously corrupted activity records in the database.

#### Configuration
Set your LinkedIn token in `.env`:
```env
LINKEDIN_ACCESS_TOKEN=AQX...
# Optional interval in hours for Celery Beat schedule (default: 6)
LINKEDIN_SYNC_HOURS_INTERVAL=6
```

#### Connector API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/connectors/linkedin/status` | Returns connector configuration status and active REST API versions. |
| `POST` | `/api/v1/connectors/linkedin/sync` | Triggers on-demand synchronization. Supports `sync_messages=true`, `sync_connections=true`, and `async_run=true` (for Celery background offload). |

#### Automated Celery Execution
- **Celery Beat**: Configured in `cdb.workers.celery_app` to automatically run `sync_linkedin_direct` every 6 hours.
- **On-Demand Background Task**: Passing `?async_run=true` to the sync endpoint immediately queues the job to Redis and Celery worker with an instant `200 OK` response.

---

### Direct Notion Connector

The direct Notion connector synchronizes meeting notes, debriefs, attendee lists, summaries, and action items directly into CDB without relying on external n8n workflows:

1. **Dual-Mode Sync Support**:
   - **Direct Notion API (Primary)**: Directly queries Notion databases (`/v1/databases/{id}/query`) and child blocks (`/v1/blocks/{id}/children`) using `NOTION_API_KEY`.
   - **Jager PostgreSQL Fallback**: Reads directly from `s_notion.meeting_notes` if `JAGER_DATABASE_URL` is set.
2. **Entity Linking & Intake Ingestion**:
   - Extracts structured meeting metadata into `IntakeNotionMeetingNote`.
   - Resolves meeting participants against golden records in `Person` table.
   - Automatically populates `Activity` timeline with meeting debriefs and action items.

#### Configuration
Set your Notion token and target database IDs in `.env`:
```env
NOTION_API_KEY=secret_...
# Optional interval in hours for Celery Beat schedule (default: 6)
NOTION_SYNC_HOURS_INTERVAL=6
# Comma-separated Notion database UUIDs (optional, defaults to standard meeting notes databases)
NOTION_MEETING_NOTES_DATABASE_IDS=3876e98d4ef8807eab9be1b0b029246c,3876e98d4ef880a6a61ae99d8912694f,3a36e98d4ef88084a1aec60052a3cb80
```

#### Connector API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/connectors/notion/status` | Returns Notion configuration status, API version, and monitored database IDs. |
| `POST` | `/api/v1/connectors/notion/sync` | Triggers on-demand synchronization. Supports `source='auto'`, `'notion_api'`, `'jager_db'`, and `async_run=true` (for Celery background offload). |

#### Automated Celery Execution
- **Celery Beat**: Configured in `cdb.workers.celery_app` to automatically run `sync_notion_direct` every 6 hours.
- **On-Demand Background Task**: Passing `?async_run=true` queues the job directly to the Celery worker.

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
│       ├── README.md                  # Frontend Architecture & App Router specification
│       └── vitest.config.ts
├── scripts/                           # Database cloning & management utilities
├── docker-compose.yml
├── .env.example
├── README.md                          # Root system overview & quickstart
└── LICENSE
```

---

## 📖 Documentation Index

All core technical specifications are colocated directly alongside their respective codebase modules:

| Document | Location | Purpose |
|----------|----------|---------|
| **Database Schema** | [`src/backend/db/README.md`](src/backend/db/README.md) | Authoritative PostgreSQL 16 schema reference (core, junction, dimension tables, triggers, indexes) |
| **API Specification** | [`src/backend/cdb/api/README.md`](src/backend/cdb/api/README.md) | REST API contracts, endpoints, error envelopes, and authentication |
| **Entity Resolution Engine** | [`src/backend/cdb/services/entity_resolution/README.md`](src/backend/cdb/services/entity_resolution/README.md) | Normalization rules, matching signal hierarchy, and merge precedence |
| **Opportunity & Risk Signal Catalog** | [`src/backend/cdb/services/signals/README.md`](src/backend/cdb/services/signals/README.md) | Commercial opportunity and churn risk taxonomy, business interpretations, and playbooks |
| **Backend Architecture** | [`src/backend/README.md`](src/backend/README.md) | Clean Architecture layer structure, services, models, and workers |
| **Frontend Architecture** | [`src/frontend/README.md`](src/frontend/README.md) | Next.js 15 App Router structure, categorized navigation, and state patterns |
| **Scripts & DB Utilities** | [`scripts/README.md`](scripts/README.md) | Production-to-dev clone script and database operations |


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
