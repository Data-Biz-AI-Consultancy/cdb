# CDB — Opportunity & Risk Signals Engine

The **Signals Engine** continuously scans contacts, companies, pipeline deals, and engagements for high-impact commercial opportunities and relationship risks.

For step-by-step instructions on implementing new detectors, adding NBA playbooks, and testing, see the [Signal Detection Skill](../../../../.agents/skills/cdb-signal-detection/SKILL.md).

---

## 🏗️ Architecture & Data Flow

```
PostgreSQL Dimension Table (`signals`) ──► Service Catalog (`cdb.services.signals.catalog`)
                                                      │
                                                      ▼
Raw Ingestion / CRM Events ──────────────► Signal Detectors (`cdb.services.signals.detectors`)
                                                      │
                                                      ▼
                                           Next Best Action (NBA) & Briefs
                                                      │
                                                      ▼
                                           FastAPI Routers (`/api/v1/signals/*`)
```

---

## 📊 Core Signal Taxonomy

| Signal Slug | Name | Category | Target Entity | Severity | Detection Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dormant_strategic_account` | Dormant Strategic Account | `risk` | `company` | `high` | Inactivity temporal cadence (>60d / >90d) |
| `unanswered_conversation` | Unanswered Conversation | `risk` | `person` | `critical` | Inbound response SLA breach (>3d / >7d) |
| `expiring_contract` | Expiring Contract | `hybrid` | `engagement` | `high` | Contract end date approaching (<30d) |
| `leadership_change` | Leadership Change | `hybrid` | `person` | `high` | Job title / organization shift |
| `hiring_funding_event` | Hiring or Funding Event | `opportunity` | `company` | `medium` | Text pattern matching |
| `competitor_signal` | Competitor Signal | `risk` | `opportunity` | `high` | Deal loss / RFP displacement keyword detection |

---

## 🎯 Next Best Action (NBA) & AI Account Briefs

- **Next Best Action (`cdb.services.signals.nba`)**: Ranks active signals into prioritized actions using a 4D scoring formula (Base Score $\times$ Confidence + Urgency Boost + Conflict Boost - Staleness Penalty).
- **Stakeholder Deduplication & Conflict Reconciliation**: Multiple signals on the same contact are merged into a single multi-topic touchpoint. Opposing signals on an account generate a reconciled outreach playbook.
- **AI Account Intelligence Briefs (`cdb.services.account_briefs`)**: Synthesizes firmographics, relationship health, commercial posture, and active signals into an executive summary.

---

## 📁 Module Directory Structure

```
src/backend/cdb/services/signals/
├── catalog/          ← Signal dimension table schema & seed functions
├── classification/   ← Multi-entity conflict detection & quality safeguards
├── detected/         ← Detected signal models & lifecycle managers
├── detectors/        ← One subfolder per signal detector module
│   ├── competitors/
│   ├── contracts/
│   ├── dormant/
│   ├── growth/
│   ├── leadership/
│   └── unanswered/
├── feedback/         ← User false-positive feedback loops
├── nba/              ← Next Best Action ranking & playbook logic
├── routing/          ← Deterministic ownership & escalation engine
├── detector.py       ← BaseDetector ABC
├── orchestrator.py   ← Evaluates all active detectors
└── metrics.py        ← Attribution, MTTA, and FPR analytics
```

---

## 🧪 Testing

```bash
cd src/backend
uv run pytest tests/services/signals/ -v
```
