# AGENTS.md

## Vibe Coding Instructions & Core Rules

### 1. Documentation & Skill Integrity (Mandatory)
- **All documentation and skill runbooks (`SKILL.md`) must always be kept up to date per code change.**
- Whenever modifying, adding, or removing features, APIs, schemas, configurations, data models, or operational workflows:
  - Inspect relevant documentation under root and colocated `README.md` files (e.g., [API Spec](src/backend/cdb/api/README.md), [Database Schema](src/backend/db/README.md), [Entity Resolution](src/backend/cdb/services/entity_resolution/README.md), [Backend](src/backend/README.md), [Frontend](src/frontend/README.md), and root [README.md](README.md)).
  - Inspect and update all matching **`.agents/skills/<skill_name>/SKILL.md`** files (e.g. updating `cdb-signal-detection` when signals change, `cdb-add-connector` when connectors/intake models evolve, `cdb-api-client-patterns` when endpoints/envelopes change, `cdb-alembic-migrations` when schema conventions shift).
  - Synchronize code, documentation, and skill definitions within the same change/PR.
  - Never leave documentation or skills stale or in a broken state after code modifications.

### 2. CI & Code Quality Verification (Mandatory)
- **Always run and pass all linters, formatters, and automated tests before finalizing any change.**
- **Backend Verification**:
  - Run `ruff check .` and `ruff format --check .` in `src/backend` (fix with `ruff check --fix .` and `ruff format .`).
  - Run `pytest` in `src/backend`.
- **Frontend Verification**:
  - Run `npm run typecheck` in `src/frontend`.
  - Run `npm test` in `src/frontend`.
- Never commit or complete a turn with unformatted code, unused imports/variables, lint violations, or failing test suites.

### 3. File Length & Modularity Limits (Mandatory)
- **Code files must not exceed 400–500 lines.**
- Whenever a file approaches or exceeds this threshold, it must be proactively refactored and decomposed into smaller, focused modules, components, custom hooks, services, or utilities.
- Avoid monolithic files; maintain clean separation of concerns and co-locate subcomponents/utilities in dedicated folders when needed.

---

## 🧭 Repository Skills Index (`.agents/skills/`)

Operational procedures, runbooks, and deep architectural specs are codified as progressive skills:

- **[cdb-repo-architecture](.agents/skills/cdb-repo-architecture/SKILL.md)**: Open-core repo strategy, public vs `cdb-cloud` boundaries, licensing.
- **[cdb-release-workflow](.agents/skills/cdb-release-workflow/SKILL.md)**: Semantic-release, Conventional Commits, Docker multi-arch GHCR builds.
- **[cdb-signal-detection](.agents/skills/cdb-signal-detection/SKILL.md)**: Adding/modifying signals, catalog entries, NBA actions, and testing.
- **[cdb-add-connector](.agents/skills/cdb-add-connector/SKILL.md)**: Ingestion pipeline for new data connectors (intake model → ER → API route).
- **[cdb-entity-resolution](.agents/skills/cdb-entity-resolution/SKILL.md)**: ER normalisation rules, candidate review queues, and ML scorer.
- **[cdb-alembic-migrations](.agents/skills/cdb-alembic-migrations/SKILL.md)**: Safe schema migrations, rollback testing, and dimension seeding.
- **[cdb-database-ops](.agents/skills/cdb-database-ops/SKILL.md)**: Database cloning (`clone_prod_to_dev.sh`), Docker management, safety checks.
- **[cdb-api-client-patterns](.agents/skills/cdb-api-client-patterns/SKILL.md)**: Auth headers, pagination envelopes, error handling, bulk operations.
