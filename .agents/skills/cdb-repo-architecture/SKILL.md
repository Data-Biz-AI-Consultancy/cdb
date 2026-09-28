---
name: cdb-repo-architecture
description: >-
  Use this skill when the user asks about the CDB open-core repo strategy,
  what code belongs in the public `cdb` repo vs the private `cdb-hub` (or `cdb-cloud`) repo,
  the integration pattern between them, licensing (MIT),
  or how `cdb-hub` consumes the core backend artifact.
---

# CDB Open Core Repository Architecture

CDB follows the **Open Core** model: the public `cdb` repo is **MIT licensed**;
commercial SaaS features live in a **separate private** `cdb-hub` repo that imports `cdb`
as a pinned pip dependency.

---

## Repo Split Decision

### Stays in `cdb` (public, MIT)

| Area | Paths |
|------|-------|
| Core data models | `src/backend/cdb/models/` |
| Entity Resolution engine | `src/backend/cdb/services/entity_resolution/` |
| Signal detection engine | `src/backend/cdb/services/signals/` |
| NBA ranking engine | `src/backend/cdb/services/signals/nba/` |
| All connectors (LinkedIn, Notion, CSV) | `src/backend/cdb/services/connectors/`, `src/backend/cdb/services/ingestion/` |
| Core FastAPI routes | `src/backend/cdb/api/` |
| Next.js frontend (self-hosted UI) | `src/frontend/` |
| Alembic migration history | `src/backend/db/alembic/` |
| Self-hosted Docker Compose | `docker-compose.yml` |
| CI + tests for the above | `.github/workflows/ci.yml`, `src/backend/tests/` |

### Goes into `cdb-hub` (private, proprietary)

- Multi-tenancy layer (`Tenant`, `Membership` models, `tenant_id`, context isolation)
- Per-tenant API key management & RBAC
- Billing & subscription (Stripe integration, credits & tiers: OSS, Lite, Business €20)
- Consented firmographic network sharing & Zero-PII sanitization
- GDPR tooling (Article 20 data export, Right to be forgotten erasure)
- SaaS-specific CI/CD & orchestration
- Admin portal (tenant management, invite workflows)

---

## Integration Pattern (`cdb-hub` imports `cdb` as a package)

```python
# cdb-hub/src/backend/hub/main_hub.py
from fastapi import FastAPI
from hub.tenancy.middleware import TenantContextMiddleware
from hub.billing.router import router as billing_router
from hub.gdpr.router import router as compliance_router
from hub.network.router import router as network_router
from cdb.api.v1.router import api_v1_router as cdb_core_router

app = FastAPI(...)
app.add_middleware(TenantContextMiddleware)
app.include_router(billing_router)
app.include_router(compliance_router)
app.include_router(network_router)
app.include_router(cdb_core_router)
```

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

---

## Making `cdb` Pip-Installable

The `src/backend/pyproject.toml` is configured with `hatchling` as the build backend.
To build and publish:

1. Build: `cd src/backend && uv build`
2. Publish to GitHub Releases (automatic on tagged release) or PyPI/GHCR:
   ```bash
   uv publish --token ${{ secrets.PYPI_TOKEN }}
   ```
3. `cdb-hub` pins: `cdb==1.43.0` in its `pyproject.toml`.

---

## License Summary

**Status**: MIT License. Designed for single-tenant organizational use and transparent extension.

---

## References

- [`pyproject.toml`](../../src/backend/pyproject.toml) — Package metadata for `cdb`
- [`docker-compose.yml`](../../docker-compose.yml) — Self-hosted quickstart
- [`.github/workflows/release.yml`](../../.github/workflows/release.yml) — Release pipeline
- [`src/backend/cdb/main.py`](../../src/backend/cdb/main.py) — Core FastAPI app entrypoint
