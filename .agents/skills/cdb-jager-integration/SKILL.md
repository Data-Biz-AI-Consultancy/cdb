---
name: cdb-jager-integration
description: >-
  Use this skill when understanding or implementing the boundary, communication contracts,
  and integration between the CDB repository (Customer Data Platform/CRM/FastAPI/Next.js)
  and the Jager repository (automation/n8n/dapp/OLAP). Covers REST API authentication (`X-API-Key`),
  MotherDuck OLAP synchronization (`ingest_cdb.py`), database boundaries, port allocation,
  and Docker network co-location.
---

# CDB & Jager Cross-Repository Integration Guide

This guide defines the architectural boundary and communication protocols between **CDB** and **Jager**.

---

## 🏛️ Architectural Boundary & Core Responsibilities

```
┌────────────────────────────────────────┐       HTTP REST API       ┌────────────────────────────────────────┐
│              Jager Repo                │ ────────────────────────► │                CDB Repo                │
│  (Automation, Ingestion & ML Engine)   │  `X-API-Key: CDB_API_KEY` │   (Golden Records, CRM & Signals)      │
│                                        │ ◄──────────────────────── │                                        │
│  - n8n Workflow Orchestrator (5678)    │   OLAP Sync (ingest_cdb)  │  - FastAPI Backend (8000 / 8001)       │
│  - DAPP Service (dlt, dbt, ml)         │                           │  - Next.js 15 Web UI (3001)            │
│  - Operational PostgreSQL (5432)       │                           │  - Dedicated PostgreSQL 16 (5433)      │
│  - MotherDuck Analytics OLAP           │                           │  - Celery Worker & Redis (6380)        │
└────────────────────────────────────────┘                           └────────────────────────────────────────┘
```

| Dimension | CDB (Client DataBase) | Jager |
|---|---|---|
| **Domain** | Golden person/company directory, entity resolution, activity timelines, deal pipeline, opportunity & risk signals | Multi-channel scraping, AI memory extraction, content scheduling, ML predictions, workflow automation |
| **Primary Frameworks** | FastAPI, Next.js 15 App Router, SQLAlchemy 2.0, Celery | n8n, Python (`dlt`, `dbt`, `duckdb`), Node.js |
| **Databases** | PostgreSQL (`cdb` on port 5433) + Redis (port 6380) | PostgreSQL (`jager`, `n8n` on port 5432) + MotherDuck (OLAP) |
| **Database Boundary** | Strictly isolated — CDB never connects directly to `jager` database | Strictly isolated — Jager never connects directly to `cdb` database |

---

## 🔗 Integration Protocols

### 1. HTTP REST Ingestion (Jager $\rightarrow$ CDB)
Jager workflows in n8n and Python scripts interact with CDB strictly via HTTP REST endpoints:

- **Base URL**: `http://localhost:8001/api/v1` (local) or `http://cdb-api:8000/api/v1` (Docker network).
- **Authentication**: All requests from Jager must pass `X-API-Key: ${CDB_API_KEY}` in the request header.
- **Common Ingest Endpoints**:
  - `POST /api/v1/ingest/linkedin-connections`: Ingests connection exports.
  - `POST /api/v1/ingest/linkedin-messages`: Ingests conversation threads and timestamps.
  - `POST /api/v1/ingest/notion-meeting-notes`: Ingests meeting debriefs and attendee links.

### 2. Analytical OLAP Synchronization (CDB $\rightarrow$ Jager MotherDuck)
To enable cross-functional reporting, dbt analytics, and ML feature extraction in MotherDuck:

- **Pipeline Script**: `src/dapp/olap/ingest_cdb.py` in Jager.
- **Mechanism**: Calls CDB REST endpoints (`GET /api/v1/persons`, `GET /api/v1/companies`, `GET /api/v1/activities`, `GET /api/v1/signals/detected`), then writes data into the **`s_cdb`** schema inside MotherDuck using `dlt` merge mode.
- **Trigger**: Exposed as `POST /run/ingest_cdb` on the `dapp` service and scheduled via n8n.

---

## 🔌 Port Allocation (Zero Collisions)

| Service | Stack | Host Port | Internal Port | Description |
|---------|-------|-----------|---------------|-------------|
| **CDB Web UI** | CDB | `3001` | `3000` | Next.js 15 App Router user interface |
| **CDB API** | CDB | `8001` (or `8000`) | `8000` | FastAPI REST API backend (Swagger: `/docs`) |
| **CDB PostgreSQL** | CDB | `5433` | `5432` | Dedicated CRM database |
| **CDB Redis** | CDB | `6380` | `6379` | Celery broker & cache |
| **Caddy Proxy** | Jager | `80`, `443` | `80`, `443` | SSL termination & reverse proxy |
| **N8N** | Jager | `5678` | `5678` | Workflow orchestration UI & webhook runner |
| **Jager PostgreSQL** | Jager | `5432` | `5432` | Stores `jager` operational tables and `n8n` state |
| **DAPP Service** | Jager | `8000` (internal) | `8000` | FastAPI service for `dlt` and ML inference |

---

## 🛠️ Local Development Co-Location

To run both stacks concurrently on your machine:

```bash
# Terminal 1: Start Jager Stack
cd /Users/jimmypang/AntigravityProjects/JagerProjects/Jager
docker-compose --profile all up -d

# Terminal 2: Start CDB Stack
cd /Users/jimmypang/AntigravityProjects/JagerProjects/cdb
docker compose up -d
```

Both stacks connect locally without port collisions:
- CDB Web UI: [http://localhost:3001](http://localhost:3001)
- CDB API Docs: [http://localhost:8001/docs](http://localhost:8001/docs)
- Jager N8N: [http://localhost:5678](http://localhost:5678) (or [http://localhost](http://localhost) via Caddy)

---

## 🚀 Production Deployment Co-Location (`Jager-Deployment`)

In production, both repositories are checked out and managed by the private **`Jager-Deployment`** repository on a shared Docker bridge network (`jager_network`):
- `Jager` services access `CDB` directly via internal hostname `http://cdb-api:8000`.
- All shared credentials (`CDB_API_KEY`, `CDB_SECRET_KEY`, `MOTHERDUCK_TOKEN`) are injected into both compose stacks simultaneously.
- See [`jager-release-and-deployment`](../../Jager/.agents/skills/jager-release-and-deployment/SKILL.md) for full deployment mechanics.
