---
name: cdb-repo-architecture
description: >-
  Use this skill when the user asks about the CDB open-core repo strategy,
  what code belongs in the public `cdb` repo vs the private `cdb-cloud` repo,
  the integration pattern between them, the license decision (Apache 2.0 vs AGPL/BSL),
  or how to scaffold the `cdb-cloud` private repository for the first time.
---

# CDB Open Core Repository Architecture

CDB follows the **Open Core** model (Option B): the public `cdb` repo is Apache 2.0 licensed;
commercial SaaS features live in a **separate private** `cdb-cloud` repo that imports `cdb-backend`
as a pinned pip dependency.

---

## Repo Split Decision

### Stays in `cdb` (public, Apache 2.0)

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

### Goes into `cdb-cloud` (private, proprietary)

- Multi-tenancy layer (`Organization` model, `tenant_id`, row-level security)
- Per-tenant API key management
- Billing & subscription (Stripe/Paddle integration)
- Self-serve onboarding & org creation flow
- GDPR tooling (erasure endpoints, consent tracking, data export)
- Per-tenant connector credential vault
- Rate limiting & quota enforcement
- SaaS-specific CI/CD (K8s deploy, multi-region)
- Tenant-scoped Celery queue routing
- Audit logging (data access log, security events)
- Enterprise SSO / SAML
- Admin portal (tenant management, usage metrics)

---

## Integration Pattern (`cdb-cloud` imports `cdb` as a package)

```python
# cdb-cloud/src/backend/main_cloud.py
from cdb.main import app as core_app
from saas.tenancy.middleware import TenantMiddleware
from saas.billing.router import billing_router
from saas.gdpr.router import gdpr_router

core_app.add_middleware(TenantMiddleware)
core_app.include_router(billing_router, prefix="/api/v1/billing")
core_app.include_router(gdpr_router, prefix="/api/v1/gdpr")
```

```toml
# cdb-cloud/src/backend/pyproject.toml
[project]
dependencies = [
    "cdb-backend>=1.40.0",  # pinned to public core release
    "stripe>=8.0",
    ...
]
```

The package name is already `cdb-backend` (`pyproject.toml` in `src/backend/`). On every `cdb` release,
`cdb-cloud` bumps this pinned dependency.

---

## Making `cdb-backend` Pip-Installable

The `src/backend/pyproject.toml` is already configured with `hatchling` as the build backend.
To publish on a release:

1. Build: `cd src/backend && uv build`
2. Publish to GHCR (as an OCI artifact) or PyPI:
   ```bash
   # GHCR example (private registry usable by cdb-cloud):
   uv publish --index ghcr+https://ghcr.io/YOUR_ORG/cdb-backend
   ```
3. `cdb-cloud` pins: `cdb-backend==1.40.0` in its `pyproject.toml`.

---

## License Considerations

| Option | Impact |
|--------|--------|
| Keep Apache 2.0 | Competitors may host the core as a SaaS legally |
| Switch to AGPL v3 | Competitors must open-source modifications if served over network |
| Add Commons Clause | Prohibits commercial hosting without a license from you |
| BSL (Business Source License) | OSS for use; commercial SaaS hosting requires your license |

**Current status**: Apache 2.0. For pilot launch, keeping Apache 2.0 is fine.
Evaluate AGPL v3 or Commons Clause before scaling.

---

## Practical Migration Steps

1. **Today**: Continue developing in `cdb` as-is (pilot work).
2. **When multi-tenancy begins**: Create private `cdb-cloud` repo.
3. **First commit in `cdb-cloud`**: `TenantMiddleware` + `Organization` model importing `cdb-backend`.
4. **GDPR, billing, onboarding**: All go exclusively into `cdb-cloud`.
5. Automate `cdb-cloud` to re-pin `cdb-backend` whenever `cdb` cuts a release (Renovate or Dependabot).

---

## References

- [`pyproject.toml`](../../src/backend/pyproject.toml) — Package metadata for `cdb-backend`
- [`docker-compose.yml`](../../docker-compose.yml) — Self-hosted quickstart
- [`.github/workflows/release.yml`](../../.github/workflows/release.yml) — Release pipeline
- [`src/backend/cdb/main.py`](../../src/backend/cdb/main.py) — Core FastAPI app entrypoint
