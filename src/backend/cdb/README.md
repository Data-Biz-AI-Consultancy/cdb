# CDB Backend Architecture (`src/cdb/`)

This directory contains the primary Python application packages for **CDB (Client DataBase)**.

It is structured following the **Layered Clean Architecture** pattern, separating concerns across API routing, data validation, business logic, persistence, and background tasks.

---

## 🏛️ Directory Structure & Layer Responsibilities

```
src/cdb/
├── api/          # 1. HTTP Presentation Layer
│   ├── deps.py   # Shared FastAPI dependencies (get_current_user, require_admin, require_api_key)
│   └── v1/       # Versioned API routes (/auth, /health, /persons, /companies, etc.)
│
├── schemas/      # 2. API Contract & Validation Layer (Pydantic)
│   ├── common.py # Pagination wrappers & standardized error envelope shapes
│   ├── auth.py   # Request/response schemas for authentication & user endpoints
│   └── ...       # Entity-specific request/response schemas
│
├── services/     # 3. Domain & Business Logic Layer (Pure Python)
│   ├── entity_resolution/ # Normalization, rule-based matching, and merge engine
│   └── ingestion/         # Ingestion processors (LinkedIn, Notion, CSV/XLSX)
│
├── models/       # 4. Database Persistence Layer (SQLAlchemy 2.x)
│   ├── base.py   # Declarative Base, UUID primary keys, and timestamp mixins
│   ├── user.py   # users table
│   ├── person.py # persons table & GIN full-text search definitions
│   └── ...       # All 14 Core, Junction, Intake, and ER database tables
│
├── core/         # 5. Cross-Cutting Infrastructure
│   ├── config.py   # Application settings & environment variable management (.env)
│   ├── database.py # Async database engine and session management
│   ├── security.py # JWT signing/verification and bcrypt password hashing
│   └── errors.py   # Standardized JSON error envelope handlers
│
├── workers/      # 6. Background Task Processing Layer
│   └── celery_app.py # Celery worker instance for async ER and bulk ingestion
│
└── main.py       # Application entrypoint (FastAPI app factory & middleware)
```

---

## 🔄 Request Lifecycle (How Layers Interact)

```
                       HTTP Request (Client / Jager n8n)
                                       │
                                       ▼
1. api/            FastAPI Router receives request, validates headers & query params
                                       │
                                       ▼
2. schemas/        Pydantic validates the request body payload & types
                                       │
                                       ▼
3. services/       Business logic executes (e.g. matching algorithms, dedup rules)
                                       │
                                       ▼
4. models/         SQLAlchemy executes async queries against PostgreSQL
                                       │
                                       ▼
5. schemas/        Output serialized into standardized response envelope (excluding secrets)
                                       │
                                       ▼
                       HTTP Response (JSON)
```

---

## 💡 Key Architectural Guidelines

1. **Keep `models/` (DB) and `schemas/` (API) Separate**:
   - `models/` represents the physical PostgreSQL table schema.
   - `schemas/` represents the public JSON contract. Secrets (like `hashed_pw`) and internal details must never leak into schemas.
2. **Thin Handlers, Rich Services**:
   - Keep route functions in `api/` focused on HTTP concerns (status codes, query parsing).
   - Place business logic in `services/` so it can be reused across API endpoints, CLI scripts, and Celery background workers.
3. **Async Everywhere**:
   - Use `async`/`await` for database queries (`AsyncSession`) and network I/O.
