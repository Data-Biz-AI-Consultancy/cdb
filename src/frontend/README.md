# CDB Frontend Architecture (`src/frontend/`)

This directory contains the Next.js 15 App Router web client for **CDB (Client DataBase)**.

It provides a modern, fast, responsive interface for managing persons, companies, relationships, activities, pipelines, leads, opportunities, entity resolution review queues, and data ingestion.

---

## 🏛️ Directory Structure & App Router Hierarchy

```
src/frontend/
├── src/
│   ├── app/                      # Next.js App Router pages and layouts
│   │   ├── layout.tsx            # Global root layout (Navbar, Theme, Sidebar)
│   │   ├── page.tsx              # Landing / Dashboard Overview page
│   │   ├── persons/              # Directory: Unified Person Golden Records & Detail Pages
│   │   ├── companies/            # Directory: Company Profiles & Member Relationships
│   │   ├── review/               # Directory: Entity Resolution Merge Review Queue
│   │   ├── activities/           # Pipeline & Engagements: Chronological Activity Feed
│   │   ├── leads/                # Pipeline & Engagements: Lead Qualification Pipeline
│   │   ├── opportunities/        # Pipeline & Engagements: Deal & Partnership Kanban/List
│   │   ├── engagements/          # Pipeline & Engagements: Active Client Engagements
│   │   ├── ingestion/            # Settings: Data Intake & File Upload Portal (LinkedIn/CSV/Notion)
│   │   └── settings/             # Settings: System, API Keys & Platform Configurations
│   │
│   ├── components/               # Reusable UI & Layout Components
│   │   ├── layout/               # Sidebar, AppHeader, NavGroup, UserMenu
│   │   ├── ui/                   # Buttons, Modals, Badges, Tables, Inputs, Cards
│   │   └── modules/              # Domain-specific components (PersonCard, ERReviewModal, etc.)
│   │
│   ├── lib/                      # Utilities & Shared Helpers
│   │   ├── api.ts                # Fetch client configured for CDB API backend & CSRF/Tokens
│   │   ├── utils.ts              # Styling helpers, string formatters, date utilities
│   │   └── types/                # TypeScript interfaces mirroring API contracts
│   │
│   └── styles/                   # Global styles and Tailwind CSS configurations
│
├── public/                       # Static assets, icons, and logos
├── Dockerfile                    # Multi-stage production container build
├── next.config.js                # Next.js runtime & proxy configurations
├── package.json                  # Dependencies (Next.js 15, React 19, Lucide, Tailwind)
└── vitest.config.ts              # Unit and component test runner configuration
```

---

## 🧭 Grouped Navigation Hierarchy

The application navigation is organized into 3 clear functional categories:

1. **Directory**
   - **Persons** (`/persons`, `/persons/[id]`): Golden records of natural persons, contact intelligence, segment badges, engagement temperature, full history timeline (LinkedIn messages, Notion meeting notes, emails, calls), employment history, attached opportunities, attached leads, and the **`person_history` audit changelog** with field-level diffs and action dimensions.
   - **Companies** (`/companies`): Company profiles, domain mappings, and linked employees.
   - **Review Queue** (`/review`): Side-by-side comparison for ambiguous Entity Resolution pairs.

2. **Pipeline & Engagements**
   - **Activities** (`/activities`): Full chronological activity feed (meetings, calls, notes, messages).
   - **Leads** (`/leads`): Interest qualification funnel (`New` → `Contacted` → `Qualified` → `Converted`) with conversation transcript & description viewer, default recency sorting (most recent lead first), signal strength badges, search, and one-click opportunity conversion modal.
   - **Opportunities** (`/opportunities`): Interactive drag-and-drop Kanban deal pipeline with pipeline forecasting KPIs (Active Pipeline, Confidence-Adjusted Weighted Value, Win Rate %), first-class Title & Description fields, Confidence Level meters, automated Stale (30d+) & Expired (90d+) inactivity alerts, overdue resolution target warnings (`🚨 Overdue`), attached contact persons & companies management, and a complete opportunity history (audit log & activity timeline).
   - **Client Engagements** (`/engagements`): Active client engagements, deliverables, and relationship metrics.

3. **Settings**
   - **Data Ingestion** (`/ingestion`): File upload and intake portal for LinkedIn, Notion, and CSV imports.
   - **System & Platform** (`/settings`): API keys, environment settings, user preferences, and service status.

---

## ⚡ Local Development

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Run Vitest test suite
npm test

# Run TypeScript typecheck
npm run typecheck
```
