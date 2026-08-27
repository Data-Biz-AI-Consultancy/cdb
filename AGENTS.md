# AGENTS.md

## Vibe Coding Instructions & Core Rules

### 1. Documentation Integrity (Mandatory)
- **All documentation must always be kept up to date per code change.**
- Whenever modifying, adding, or removing features, APIs, schemas, configurations, or architecture:
  - Inspect relevant documentation under root and colocated `README.md` files (e.g., [API Spec](src/backend/cdb/api/README.md), [Database Schema](src/backend/db/README.md), [Entity Resolution](src/backend/cdb/services/entity_resolution/README.md), [Backend](src/backend/README.md), [Frontend](src/frontend/README.md), and root [README.md](README.md)).
  - Synchronize documentation and code within the same change/PR.
  - Never leave documentation stale or in a broken state after code modifications.

