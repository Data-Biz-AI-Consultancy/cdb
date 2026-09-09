# CDB — Opportunity & Risk Signal Catalog

## Overview

The **Opportunity & Risk Signal Catalog** defines the standard business event ontology in CDB for detecting high-impact commercial opportunities and relationship risks across contacts, client companies, pipeline deals, and active engagements.

Signals are modeled as a first-class **PostgreSQL dimension table** (`signals`), adhering to the dimensional design pattern established by `person_actions` and `opportunity_actions`.

---

## Architecture & Data Flow

```
   ┌─────────────────────────────────────────────────────────────┐
   │             PostgreSQL Dimension Table: `signals`           │
   │  (slug PK, name, category, target_entity, severity,         │
   │   business_interpretation, parameters, recommended_action)   │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │     Service Layer: `cdb.services.signals.catalog`           │
   │  - get_signals_from_db(category, target_entity, severity)   │
   │  - get_signal_by_id(signal_id)                              │
   │  - compute_catalog_summary(signals)                         │
   │  - ensure_signals_dimension(db)                             │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │     FastAPI Router: `/api/v1/signals/catalog`               │
   │  - GET /api/v1/signals/catalog                              │
   │  - GET /api/v1/signals/catalog/{signal_id}                  │
   └─────────────────────────────────────────────────────────────┘
```

---

## Signal Catalog Taxonomy

| Signal ID | Name | Category | Target Entity | Severity | Detection Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dormant_strategic_account` | Dormant Strategic Account | `risk` | `company` | `high` | `temporal_cadence` |
| `unanswered_conversation` | Unanswered Conversation | `risk` | `person` | `critical` | `temporal_cadence` |
| `expiring_contract` | Expiring Contract | `hybrid` | `engagement` | `high` | `temporal_cadence` |
| `leadership_change` | Leadership Change | `hybrid` | `person` | `high` | `deterministic_rule` |
| `hiring_funding_event` | Hiring or Funding Event | `opportunity` | `company` | `medium` | `text_pattern` |
| `competitor_signal` | Competitor Signal | `risk` | `opportunity` | `high` | `text_pattern` |

---

## Detailed Signal Definitions & Business Interpretations

### 1. `dormant_strategic_account`
* **Name**: Dormant Strategic Account
* **Category**: `risk`
* **Target Entity**: `company`
* **Severity**: `high` (Default) / `critical` (if > 90 days inactive)
* **Business Interpretation**:
  In consulting and advisory, repeat business and account expansion represent 60–80% of revenue. When a strategic account becomes dormant, relationship context atrophies, executive sponsors drift away, and competitors can penetrate the account without visibility. Dormancy is the leading indicator of client churn.
* **Trigger Criteria**:
  * Qualifying conditions: Company has a signed engagement, won opportunity, or belongs to the `clients_and_prospects` segment.
  * Inactivity thresholds: No recorded activity (meeting, call, message) in `warning_days: 60` or `critical_days: 90`.
* **Recommended Action**:
  * **Playbook**: `executive_touchpoint` (`schedule_sync`)
  * **Title**: Schedule Executive Check-In or QBR
  * **Description**: Reach out to past client sponsors with a relevant industry benchmark, new architectural case study, or offer a complimentary advisory check-in.

---

### 2. `unanswered_conversation`
* **Name**: Unanswered Conversation
* **Category**: `risk`
* **Target Entity**: `person`
* **Severity**: `critical`
* **Business Interpretation**:
  Lead conversion probability and client trust decline precipitously with response latency. Dropping an inbound thread or failing to follow up on a meeting action item signals operational slack, forfeits deal momentum, and severely harms professional credibility.
* **Trigger Criteria**:
  * Inbound message received via LinkedIn, email, or WhatsApp where the last sender was the external contact.
  * No outbound reply or activity within `warning_days: 3` (Warning) or `critical_days: 7` (Critical SLA breach).
  * Open to-do items from Notion meeting debriefs older than 5 days.
* **Recommended Action**:
  * **Playbook**: `rapid_response` (`send_message`)
  * **Title**: Reply to Open Thread
  * **Description**: Triage the unanswered message thread immediately; draft and send a thoughtful reply or schedule the requested call.

---

### 3. `expiring_contract`
* **Name**: Expiring Contract
* **Category**: `hybrid` (Opportunity for renewal/upsell + Risk of revenue cliff)
* **Target Entity**: `engagement`
* **Severity**: `high`
* **Business Interpretation**:
  Fixed-term consulting contracts require renewal lead time. If extension discussions do not commence 30–60 days prior to contract expiration, client procurement cycles and quarterly budget reallocations cause billable interruptions or account loss. It also represents the prime window for scope expansion and rate reviews.
* **Trigger Criteria**:
  * `contract_status == 'signed'` and `status in ('active', 'in_delivery')`.
  * `expected_end_date` within `early_warning_days: 60` or `urgent_renewal_days: 30`.
* **Recommended Action**:
  * **Playbook**: `contract_renewal` (`prepare_proposal`)
  * **Title**: Initiate Contract Renewal & Scope Review
  * **Description**: Schedule a project wrap/renewal milestone meeting with the delivery sponsor; prepare an extension Statement of Work (SOW) or retainer expansion proposal.

---

### 4. `leadership_change`
* **Name**: Leadership Change
* **Category**: `hybrid` (Risk of lost champion + Opportunity at new account)
* **Target Entity**: `person`
* **Severity**: `high`
* **Business Interpretation**:
  B2B consulting services are bought by people, not logos. When an internal champion departs, ongoing projects and future renewals are vulnerable to budget freezes. Conversely, a champion joining a new company creates an immediate warm pipeline, while a newly hired executive at a target account brings a fresh mandate and budget for change.
* **Trigger Criteria**:
  * Key stakeholder role ends at an active client account (`is_current = False`).
  * New executive affiliation added with executive title (`CTO`, `VP`, `Head of`, `Director`) within the last 60 days.
* **Recommended Action**:
  * **Playbook**: `stakeholder_remapping` (`outreach_and_mapping`)
  * **Title**: Congratulate Transitioned Leader & Map Successor
  * **Description**: If a champion moved, congratulate them at their new firm to explore new opportunities; concurrently identify and build rapport with the incoming successor at the client account.

---

### 5. `hiring_funding_event`
* **Name**: Hiring or Funding Event
* **Category**: `opportunity`
* **Target Entity**: `company`
* **Severity**: `medium`
* **Business Interpretation**:
  Fresh capital investment (Seed, Series A/B, PE) or aggressive hiring in data and AI signals strategic expansion coupled with urgent execution pressure. Because hiring permanent engineers takes 3 to 6 months, these accounts experience acute capacity bottlenecks where high-impact advisory or specialized consulting can immediately accelerate timelines.
* **Trigger Criteria**:
  * Inbound messages or Notion meeting debriefs containing funding keywords (`"seed"`, `"series a"`, `"raised"`, `"funding round"`) or hiring keywords (`"hiring data"`, `"growing the team"`, `"analytics engineer"`).
  * Company attribute updates reflecting funding or headcount growth.
* **Recommended Action**:
  * **Playbook**: `growth_acceleration` (`tailored_pitch`)
  * **Title**: Pitch Rapid Delivery & Capability Acceleration
  * **Description**: Reach out to technical leadership with a tailored proposal offering team augmentation or architectural roadmap sprint during their growth phase.

---

### 6. `competitor_signal`
* **Name**: Competitor Signal
* **Category**: `risk`
* **Target Entity**: `opportunity`
* **Severity**: `high`
* **Business Interpretation**:
  Competitor presence in an active deal or client account introduces margin pressure, extended evaluation cycles, and displacement risk. Early detection enables proactive value re-framing, stakeholder alignment, and deployment of differentiation battlecards before procurement decisions crystallize.
* **Trigger Criteria**:
  * Interactions, meeting debriefs, or opportunity notes mentioning rival consultancies or keywords like `"talking to another"`, `"evaluating alternative"`, `"competing proposal"`, `"bake-off"`, `"RFP"`, `"cheaper alternative"`.
  * Lead disqualification reason referencing competitor choice.
* **Recommended Action**:
  * **Playbook**: `competitive_defense` (`battlecard_activation`)
  * **Title**: Activate Competitive Battlecard & Re-anchor Value
  * **Description**: Review competitor differentiation matrix; schedule an alignment call with the executive sponsor emphasizing unique consulting ROI, rapid time-to-value, and specialized architecture expertise.

---

## API Endpoints

### List Catalog
`GET /api/v1/signals/catalog`

Query Parameters:
- `category` (`opportunity`, `risk`, `hybrid`): Filter by category
- `target_entity` (`company`, `person`, `opportunity`, `engagement`): Filter by entity
- `severity` (`critical`, `high`, `medium`, `low`): Filter by severity
- `active_only` (default: `true`): Filter to active signals

Example Response:
```json
{
  "data": [
    {
      "id": "dormant_strategic_account",
      "name": "Dormant Strategic Account",
      "category": "risk",
      "target_entity": "company",
      "severity": "high",
      "detection_mechanism": "temporal_cadence",
      "description": "Identifies valuable or strategic accounts with no recorded interactions over an extended period.",
      "business_interpretation": "In consulting and advisory, repeat business and account expansion represent 60-80% of revenue...",
      "parameters": {
        "warning_days": 60,
        "critical_days": 90,
        "qualifying_criteria": ["has_signed_engagement", "has_closed_won_opportunity"]
      },
      "recommended_action": {
        "playbook": "executive_touchpoint",
        "action_type": "schedule_sync",
        "title": "Schedule Executive Check-In or QBR",
        "description": "Reach out to past client sponsors..."
      },
      "icon": "💤",
      "color": "amber",
      "is_active": true
    }
  ],
  "summary": {
    "total_signals": 6,
    "by_category": {
      "risk": 3,
      "opportunity": 1,
      "hybrid": 2
    },
    "by_target_entity": {
      "company": 2,
      "person": 2,
      "engagement": 1,
      "opportunity": 1
    },
    "by_severity": {
      "high": 4,
      "critical": 1,
      "medium": 1
    }
  }
}
```

### Get Single Signal
`GET /api/v1/signals/catalog/{signal_id}`

Returns the full `SignalDefinition` or `404 NOT_FOUND`.

---

## Detection Engine & `detected_signals` Bridge Table

While `signals` provides the **dimension catalog** of signal definitions, the **`detected_signals`** table acts as the **central fact/bridge table** linking active and historical signal events to core business entities:

```mermaid
erDiagram
    signals ||--o{ detected_signals : "classifies"
    companies ||--o{ detected_signals : "tagged on"
    persons ||--o{ detected_signals : "tagged on"
    opportunities ||--o{ detected_signals : "tagged on"
    engagements ||--o{ detected_signals : "tagged on"
    activities ||--o{ detected_signals : "evidenced by"

    detected_signals {
        uuid id PK
        varchar signal_id FK
        uuid company_id FK
        uuid person_id FK
        uuid opportunity_id FK
        uuid engagement_id FK
        uuid activity_id FK
        varchar status "active | acknowledged | actioned | dismissed | resolved"
        varchar severity "critical | high | medium | low"
        numeric score
        varchar title
        text summary
        jsonb metadata
        timestamptz detected_at
        timestamptz actioned_at
    }
```

### Detection Engine Rules (`detector.py`)

1. **`dormant_strategic_account`**: Scans companies qualifying as strategic (signed engagement, won deal, or strategic tag) where `MAX(activity.occurred_at)` is older than 60 days (or no activity).
2. **`unanswered_conversation`**: Scans inbound messages (LinkedIn, email, WhatsApp) where the external contact was the last sender > 3 days ago without an outbound response.
3. **`expiring_contract`**: Scans active signed engagements where `expected_end_date` is within 60 days.
4. **`leadership_change`**: Scans relationship ends in last 60 days (champion departures) and new executive relationships in last 60 days.
5. **`hiring_funding_event`**: Scans activity texts in last 90 days matching funding round or technical hiring acceleration regex patterns.
6. **`competitor_signal`**: Scans activity texts and opportunity notes for competitor evaluation or RFP bake-off mentions.

### Idempotency & Lifecycle State Machine
* **Idempotency**: Running `evaluate_all_signals` repeatedly does **not** duplicate active signals. Existing active signals for the same entity and signal code have their timestamps, severity, and metadata refreshed in place.
* **Lifecycle States**:
  - `active`: Newly detected signal awaiting review.
  - `acknowledged`: Reviewed by a team member (in triage).
  - `actioned`: Recommended action taken (e.g. QBR scheduled, message replied to). Sets `actioned_at` and `actioned_by_id`.
  - `dismissed`: Flagged as not relevant or false positive.
  - `resolved`: Naturally cleared or resolved.

### Detection & Triage Endpoints
* `POST /api/v1/signals/evaluate`: Runs detection engine on-demand across all entities and returns execution statistics.
* `GET /api/v1/signals/detected`: Paginated list of detected signals with multi-dimensional filtering (`status`, `signal_id`, `category`, `company_id`, `person_id`, `opportunity_id`, `engagement_id`, `severity`).
* `GET /api/v1/signals/detected/stats`: Summary counts of active signals grouped by severity, category, and signal type.
* `PATCH /api/v1/signals/detected/{id}`: Update signal state (`acknowledged`, `actioned`, `dismissed`) with resolution notes.

### Automated Background Execution (Celery Beat)
* **Periodic Schedule**: Configured in `celery_app.py` under `evaluate-signals-periodic`.
* **Cadence**: Runs automatically every `SIGNALS_EVALUATION_HOURS_INTERVAL` (default: 6 hours, configured in `config.py`).
* **Worker Task**: `cdb.workers.tasks.evaluate_signals_background` runs `evaluate_all_signals` asynchronously via Celery worker without blocking the API or UI.

