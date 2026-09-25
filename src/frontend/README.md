# CDB — Frontend Web Application

The **CDB Frontend** is a modern web application built on **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS**, and **TypeScript**.

For development guidelines, UI conventions, and API client usage, see the [Frontend Development Skill](../../../.agents/skills/cdb-frontend-development/SKILL.md).

---

## 🧭 Navigation & Routes Index

The application is structured into four primary functional categories:

| Category | Route | Description |
|----------|-------|-------------|
| **Directory** | `/persons` | Golden contact profiles, career timelines, and audit changelog (`person_history`) |
| | `/companies` | Company profiles, employee links, and **AI Account Intelligence Briefs** |
| | `/review` | Interactive side-by-side Entity Resolution merge review queue |
| **Pipeline & Engagements** | `/activities` | Chronological interaction feed (meetings, messages, calls) |
| | `/leads` | Lead interest qualification funnel |
| | `/opportunities` | Interactive drag-and-drop deal Kanban board with integrated signal alerts |
| | `/engagements` | Active client consulting contract and delivery tracking workspaces |
| | `/signals` | **Signals Radar** command center (Opportunities, Risks, and Hybrid signals) |
| **Analytics** | `/analytics` | Signal ROI, MTTA turnaround latency, and revenue attribution metrics |
| **Settings** | `/ingestion` | File upload & data intake portal (LinkedIn, Notion, CSV) |
| | `/settings` | System configuration, API keys, and team user directory (`/settings/users`) |

---

## ⚡ Quick Start

```bash
cd src/frontend

# Install dependencies
npm install

# Run dev server with hot reload
npm run dev

# Run test suite & typecheck
npm test
npm run typecheck
```
