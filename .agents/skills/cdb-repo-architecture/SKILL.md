---
name: cdb-repo-architecture
description: >-
  Use this skill when the user asks about the CDB open-core repo strategy,
  what code belongs in the public `cdb` repo vs the private `cdb-hub` (or `cdb-cloud`) repo,
  the integration pattern between them, licensing (MIT),
  or how `cdb-hub` consumes the core backend artifact.
---

# CDB Open Core Repository & Boundary Architecture

CDB follows the **Open Core** model:
- **`cdb` (Public Core)**: Distributed under the **MIT License** as an open-source, AI/ML-native, self-hosted personal CRM and Customer Data Platform (CDP) engine.
- **`cdb-hub` / `cdb-cloud` (Private SaaS)**: Managed commercial SaaS platform and privacy-preserving network built on top of the pinned `cdb` core engine package.

---

## 🧭 Repository Division & Decision Matrix

| Capability / Domain Area | Public Open Core (`cdb`) | Proprietary Cloud (`cdb-hub` / `cdb-cloud`) |
|---|:---:|:---:|
| **License** | **MIT License** (OSI Approved) | **Proprietary & Confidential** |
| **Visibility** | Public GitHub Repository | Private Git Repository |
| **Distribution** | PyPI (`cdb`), Docker Hub / GHCR, Source | Managed SaaS, Private Cloud / VPC |
| **Data Models** | `Person`, `Company`, `Opportunity`, `Activity`, `Engagement`, `Signal`, `NBA` | `Tenant`, `Membership`, `CreditTransaction`, `AuditLog`, `ConsentedPoolRecord` |
| **Entity Resolution & Deduplication** | Deterministic rules, ML matching, candidate review queues | Reuses core ER via tenant isolation scopes |
| **Signals & Next Best Actions** | Opportunity/risk catalog, detection jobs, NBA ranking | Reuses core engine via tenant context |
| **Connectors & Ingestion** | LinkedIn, Notion, CSV, Email ingestion pipelines | Ingestion orchestrated per-tenant via core |
| **Multi-Tenancy** | Single-tenant (self-hosted / organizational) | Multi-tenant context isolation (`tenant_id` scopes & middleware) |
| **Billing & Payments** | N/A (Free OSS) | Stripe Checkout, Subscriptions (Lite €0, Business €20), Credit Metering |
| **Identity & Access** | API Key, Local Session / Simple Auth | Multi-Tenant RBAC, Org Invites, Enterprise SSO / SAML |
| **Privacy & Consented Network** | Local SQLite / PostgreSQL storage | Consented Zero-PII Firmographic Network, Give-to-Get governance |
| **Compliance Orchestration** | Direct DB queries | Automated GDPR Article 20 Data Export & Right to be Forgotten erasure |
| **Frontend UI** | Single-Tenant CRM UI (Next.js 15 App Router) | SaaS Portal, Onboarding wizard, Billing dashboard, Admin center |
| **Self-Hosted Deployment** | Docker Compose (`docker-compose.yml`) | Multi-tenant Helm / Kubernetes manifests, Terraform |

---

## 🏛️ Scope Boundaries

### ✅ What Belongs in `cdb` (Open-Source Core)
- Core database schema and Alembic migrations (`src/backend/db/alembic/`).
- Core entity models, relationship graphs, and audit history tracking.
- Business logic for CRM, hybrid Entity Resolution, Opportunity Kanban pipeline, and Engagements.
- Ingestion workers, Celery pipelines, and direct data connectors (LinkedIn, Notion, CSV).
- Self-hosted single-tenant Docker Compose setup and core CI/CD.
- Self-hosted Next.js web application.
- Single-organization internal identity (`Person.is_internal`, host-name tokens). No tenant routing.

### Single-organization identity

`Person.is_internal` and host-speaker checks are configuration for one organization per core database. Settings `INTERNAL_EMAIL_DOMAINS`, `INTERNAL_MEMBER_EMAILS`, and `INTERNAL_HOST_IDENTIFIERS` supply the default (email lists empty; host tokens `host` and `me`). An embedding process may call `register_internal_identity_policy()` or bind `internal_identity_policy_context` for the active task. Self-hosted core does not register a policy. Schema routing and tenant registries stay in `cdb-hub`.

### ❌ What Must NEVER Be Added to `cdb` (Open-Source Core)
- Multi-tenant database isolation or tenant routing logic.
- Stripe or payment processing, commercial licensing restrictions, or paywalls.
- Proprietary enterprise SSO / SAML integrations.
- Managed cloud infrastructure code, multi-tenant billing models, or SaaS secrets.

### ✅ What Belongs in `cdb-hub` (Commercial SaaS)
- Tenant-aware API gateway and request routing (`TenantContextMiddleware`).
- Billing services, Stripe integrations, and credit usage metering.
- Tenant onboarding portal and administration tools.
- Consented cross-organization market intelligence pool (Zero-PII sanitization & Give-to-Get governance).
- Automated compliance orchestration (GDPR Article 20 exports and erasure).
- Cloud deployment manifests (Terraform, Kubernetes, Helm).

### ❌ What Must NEVER Be Added to `cdb-hub`
- Duplicated CRM models or forked copies of CDB core logic.
- Core engine features that belong in open-source CDB (always contribute upstream first).

---

## 🔗 Integration Pattern (`cdb-hub` imports `cdb` as a package)

`cdb-hub` consumes `cdb` as an immutable, pinned dependency:

```toml
# cdb-hub/src/backend/pyproject.toml
[project]
dependencies = [
    "cdb==1.43.0",  # pinned to public core release
    "stripe>=8.0.0",
    ...
]

[tool.uv.sources]
cdb = { path = "../../../cdb/src/backend", editable = true }
```

At runtime, `cdb-hub` mounts core CDB routers and wraps requests within tenant-isolation middleware:

```python
# cdb-hub/src/backend/hub/main_hub.py
from fastapi import FastAPI
from hub.tenancy.middleware import TenantContextMiddleware
from hub.billing.router import router as billing_router
from hub.gdpr.router import router as compliance_router
from hub.network.router import router as network_router
from cdb.api.v1.router import api_v1_router as cdb_core_router

app = FastAPI(title="CDB Hub API")
app.add_middleware(TenantContextMiddleware)
app.include_router(billing_router)
app.include_router(compliance_router)
app.include_router(network_router)
app.include_router(cdb_core_router)
```

---

## 📦 Building and Publishing `cdb`

The `src/backend/pyproject.toml` is configured with `hatchling` as the build backend:

1. **Build wheel/sdist**:
   ```bash
   cd src/backend && uv build
   ```
2. **Publish**:
   ```bash
   uv publish --token ${{ secrets.PYPI_TOKEN }}
   ```
3. **Consume in `cdb-hub`**:
   `cdb-hub` pins `cdb==1.43.0` in its `pyproject.toml`.

---

## 🛡️ License Governance & Legal Invariants

1. **MIT Status**: `cdb` is licensed under the permissive MIT License (`Copyright (c) 2026 data-biz-ai-consultancy`).
2. **Proprietary IP Protection**: Multi-tenant infrastructure, credit engines, and consenting network pooling in `cdb-hub` are proprietary.
3. **Zero GPL / Copyleft Contamination**: All backend and frontend dependencies are verified permissive (MIT, Apache 2.0, BSD-2/3, ISC).
4. **Inbound Contributions**: All community contributions submitted to `cdb` are governed by `CONTRIBUTING.md` and licensed under the MIT License.

---

## 📚 References

- [`pyproject.toml`](../../src/backend/pyproject.toml) — Package metadata for `cdb`
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — Contributor terms and licensing guidance
- [`LICENSE`](../../LICENSE) — Official MIT License text
- [`docker-compose.yml`](../../docker-compose.yml) — Self-hosted quickstart
- [`.github/workflows/release.yml`](../../.github/workflows/release.yml) — Release pipeline
- [`src/backend/cdb/main.py`](../../src/backend/cdb/main.py) — Core FastAPI app entrypoint
