---
name: cdb-frontend-development
description: >-
  Use this skill when developing or modifying the CDB Next.js frontend, including
  App Router layouts, API client (`lib/api.ts`), state management, UI component conventions,
  Vitest testing, and typechecking.
---

# CDB Frontend Development Guide

The CDB frontend is built with **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS**, and **TypeScript**.

---

## 1. Directory Structure & App Router Routing

```
src/frontend/src/
├── app/
│   ├── layout.tsx         ← Global root shell (Navbar, Theme, Sidebar)
│   ├── page.tsx           ← Dashboard overview
│   ├── persons/           ← Contact directory & golden profile views
│   ├── companies/         ← Company directory & AI Account Briefs
│   ├── review/            ← Entity resolution candidate review queue
│   ├── activities/        ← Chronological interaction timeline
│   ├── leads/             ← Lead qualification funnel
│   ├── opportunities/     ← Deal Kanban board & signal integration
│   ├── engagements/       ← Client contract delivery workspaces
│   ├── signals/           ← Opportunity & Risk Signals Radar (/signals, /signals/[id])
│   ├── analytics/         ← ROI & Signal Performance metrics
│   ├── ingestion/         ← File upload & manual data intake portal
│   └── settings/          ← Users directory & platform config
├── components/
│   ├── layout/            ← Navigation, sidebar, user menu
│   ├── ui/                ← Core UI primitives (buttons, modals, badges, tables, cards)
│   └── modules/           ← Domain-specific UI widgets (Kanban, BriefCard, ReviewModal)
└── lib/
    ├── api.ts             ← Standardized API client configured for backend proxy
    ├── utils.ts           ← Date formatting, class merge, styling helpers
    └── types/             ← TypeScript interfaces matching backend Pydantic schemas
```

---

## 2. API Client Conventions (`src/lib/api.ts`)

- Always use the centralized `apiFetch` helper to ensure proper `Authorization: Bearer <token>` attachment and standard error handling.
- When querying paginated lists, pass `{ page, size, sort_by, order }` query parameters.

---

## 3. UI Component Conventions

- **Modularity**: Keep components under 400 lines. Extract sub-components into dedicated folders under `components/modules/<domain>/`.
- **Color Coding**:
  - Opportunities / Upside: Emerald / Teal badges.
  - Risks / Downside: Rose / Amber badges.
  - Neutral / Info: Sky / Slate.
- **Priority Badges**: `P0` (Critical), `P1` (High), `P2` (Medium), `P3`/`P4` (Routine).

---

## 4. Local Development & Verification

```bash
cd src/frontend

# Run development server
npm run dev

# Run Vitest test suite
npm test

# Run TypeScript type check
npm run typecheck
```
