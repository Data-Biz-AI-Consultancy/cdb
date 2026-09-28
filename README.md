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
    └── Signals Radar ───────────────────────┤
        (opportunity & risk detection triage)│
                                             │
Analytics (Intelligence & ROI)               │
    └── Signal Performance & ROI ────────────┘
        (precision, MTTA & revenue impact)
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
* **Deterministic Deduplication & Evidence Fingerprinting**: Computes canonical SHA-256 hashes of underlying evidence payload to eliminate duplicate alerts and suppress re-alerting on unchanged context for dismissed, snoozed, actioned, or resolved signals.
* **Intelligent Auto Re-Opening on New Evidence**: When new, materially distinct evidence is detected for a previously resolved or dismissed signal, the system automatically transitions it back to `active`, updates the evidence fingerprint, increments `reopen_count`, and flags it in the UI with a `🔄 Re-opened (xN)` badge.
* **Rich Lifecycle Controls & Snooze State Machine**: Complete triage state management (`active`, `acknowledged`, `actioned`, `snoozed`, `dismissed`, `resolved`) with snooze duration options (1, 3, 7, 14, 30 days) and automated wake-up once `snoozed_until` expires.
* **Bulk Status Updates & Account-Level Grouping**: Batch triage multiple signals simultaneously (`POST /api/v1/signals/detected/bulk-status`) and inspect signals aggregated per client account (`GET /api/v1/signals/detected/grouped`).
* **Intelligent Stateful Tagging (`detected_signals` & `detected_signal_persons`)**: Bridge/fact table linking active signal events directly to Companies, Persons, Opportunities, Engagements, and triggering Activity evidence with structured JSON evidence contracts. Supports native multi-person signal connectivity via `detected_signal_persons` for group touchpoints and conversations, and guarantees affected account attribution (`company_id` and `company_name`) on every detected signal.
* **Deterministic Signal Ownership & Routing Engine**: Automatically resolves signal owners based on active engagement leads, open deal owners, or historical account engagement leads (`POST /api/v1/signals/detected/{id}/assign`), routing unassigned alerts to a dedicated queue.
* **Risk & Opportunity Escalation Paths**: Automatically escalates P0 emergencies and critical SLA breaches (> 7 days unanswered comms) to senior partners with prominent `🚨 ESCALATED` banners and dedicated triage filtering, alongside manual escalation paths (`POST /api/v1/signals/detected/{id}/escalate`).
* **Direct Deal Conversion & Follow-Up Workflows**: Convert opportunity and risk signals directly into pipeline deals (`POST /api/v1/signals/detected/{id}/create-opportunity`) or follow-up workflows, pre-populating valuations, delivery stages, attached companies/contacts, and evidence excerpts with bidirectional backlinks.
* **Signals Radar & Detail Investigation Web UI (`/signals`, `/signals/[id]`)**: Fast, streamlined triage dashboard featuring both a **3-Column Command Center** (`🟢 Opportunities`, `🔴 Risks`, `🟡 Hybrid & Conflicts`) and an **🏢 Group by Account** view, bulk action toolbar, user-selectable sorting controls (**Sort: Business Impact Priority (Default)**, **Newest First**, **Highest Severity**, **Highest Confidence**, **Lowest Confidence**, **Oldest First**), dedicated filtering tabs (**All Active**, **🚨 Escalated Risks**, **⚠️ Conflicting Signals**, **🔍 Needs Verification**, **📊 Success & Quality Metrics**, **Signal Dimension Catalog**), and deep-dive investigation pages on `/signals/[id]` presenting full supporting evidence dossiers, multi-entity conflict analysis, uncertainty rationale, and playbook recommendations.
* **Standalone Analytics & ROI Portal (`/analytics`)**: Dedicated executive and operational intelligence page accessible directly from the top navigation. Displays primary KPI summary cards (Action/Acceptance Rate, MTTA turnaround latency with SLA breach rates, Influenced & Protected Pipeline Revenue, and 90-day downstream opportunity & account reactivation conversions), precision proxies, dynamic lookback timeframes (30d, 90d, 180d, 1y, 2y), and breakdowns by signal rule, category, and severity.
* **Next Best Action (NBA) Ranking & Playbook Engine (`cdb.services.signals.nba`)**: Ingests active detected signals, relationship milestones, and commercial priorities to compute composite impact scores (0–100, P0–P4), multi-stakeholder action deduplication, and conflict reconciliation (harmonizing opposing commercial polarities into unified advisory agendas like `reconciled_outreach`). Exposes company-level (`GET /api/v1/companies/{id}/next-best-actions`) and global feed (`GET /api/v1/signals/nba/feed`) endpoints.
* **AI Account Intelligence Briefs (`/api/v1/companies/{id}/ai-brief`)**: Synthesizes whole-account context (active engagements, pipeline deals, stakeholder touchpoints, and detected opportunities/risks) into an executive overview, relationship health score (0–100), commercial posture (`growing`, `stable`, `at_risk`, `dormant`), key account highlights, and integrated Next Best Actions with on-demand regeneration (`POST /api/v1/companies/{id}/ai-brief/regenerate`).
* **Account-Centric Surfacing (`/companies/[id]`)**: High-visibility **AI Account Intelligence Brief** tab and alert banners on company profiles, presenting commercial posture badges, relationship health meters, deduplicated NBA playbooks, and structured Opportunity & Risk breakdowns with 1-click triage links.
* **Opportunity Workflow Integration (`/opportunities`)**: Surfacing prioritized signals directly within the opportunity Kanban pipeline (badges with active risk/opp counts & P0–P4 priority tiers), quick signal filters, and a dedicated **Signals & Risks Tab** in the deal detail drawer with supporting evidence, "why it matters now", affected account chips, and inline status updates.

### 7. Team Directory & User Access Management (`/settings/users`)
* **First-Class Team & User Management API (`/api/v1/users`)**: Complete CRUD and directory listing (`GET /api/v1/users`, `POST /api/v1/users`, `GET /api/v1/users/{id}`, `PATCH /api/v1/users/{id}`, `DELETE /api/v1/users/{id}`).
* **Role-Based Permissions & Tagging**: Support for structured organizational roles (`admin`, `manager`, `ae`, `sdr`, `member`) with active/inactive status toggles.
* **Searchable Team Picker (`UserSelect`)**: Dropdown selector displaying initials avatar, user full name, email, and role badge for assigning signal owners, escalations, deal owners, and engagement leads.
* **Dedicated Team & Users Settings Page (`/settings/users`)**: Modern UI for inviting team members, managing roles, monitoring user counts across sales/operations, and editing account details.

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

- **Authentication**: External pipelines authenticate with `X-API-Key: ${CDB_API_KEY}`.
- **Port Allocation**: PostgreSQL runs on port `5433` (preventing conflicts with Jager on `5432`); Redis runs on `6380`.
- **API Ingestion**: Standard endpoints for batch ingestion of LinkedIn Connections, LinkedIn Messages, and Notion Notes.

---

## 🔌 Native Data Connectors

CDB includes native background connectors to synchronize external platform data directly:

| Connector | Source / API | Synced Data | Sync Modes |
|-----------|--------------|-------------|------------|
| **Direct LinkedIn** | Member Portability API | Connections, Profile URLs, 28-day Message Threads | On-demand REST sync / Celery Beat (6h) |
| **Direct Notion** | Notion API (`/v1/databases`) | Meeting Notes, Attendees, Debriefs, Action Items | Direct Notion API / Jager DB Fallback / Celery Beat |

For configuration, sync endpoints, and Celery worker triggers, see the [Native Connectors Operations Skill](.agents/skills/cdb-connector-ops/SKILL.md).

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

All core technical specifications and developer skills are colocated directly alongside their respective codebase modules:

| Specification | Location | Purpose |
|---------------|----------|---------|
| **Repository Skills Index** | [`.agents/skills/`](.agents/skills/) | On-demand developer workflows (release, migrations, ER, connectors, signals, DB ops, frontend) |
| **Database Architecture** | [`src/backend/db/README.md`](src/backend/db/README.md) | PostgreSQL 16 schema reference and ER diagram |
| **API Overview** | [`src/backend/cdb/api/README.md`](src/backend/cdb/api/README.md) | REST API domain routers and global conventions (also see live `/docs`) |
| **Entity Resolution Engine** | [`src/backend/cdb/services/entity_resolution/README.md`](src/backend/cdb/services/entity_resolution/README.md) | Normalization rules, matching hierarchy, and merge precedence |
| **Opportunity & Risk Signals** | [`src/backend/cdb/services/signals/README.md`](src/backend/cdb/services/signals/README.md) | Commercial opportunity and churn risk taxonomy, NBA playbooks |
| **Backend Architecture** | [`src/backend/README.md`](src/backend/README.md) | Clean Architecture layer structure, services, models, and workers |
| **Frontend Architecture** | [`src/frontend/README.md`](src/frontend/README.md) | Next.js 15 App Router structure and navigation index |
| **Scripts & Utilities** | [`scripts/README.md`](scripts/README.md) | Production-to-dev clone script and database operations |


---

## ☁️ CDB Hub — Managed SaaS

Looking for a **hosted, managed version** of CDB without the self-hosting overhead?

**CDB Hub** is the commercial SaaS platform built on top of this open-source engine. It adds multi-tenancy, subscription billing, enterprise SSO, managed cloud infrastructure, and SLA-backed support tiers — while this repository remains fully open-source under **Apache 2.0**.

> 📖 See the [CDB Hub Repository](https://github.com/data-biz-ai-consultancy/cdb-hub) and its boundary specifications for details on commercial capabilities.

The existence of CDB Hub does **not** affect the open-source status, licensing, or community ownership of this repository.

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
