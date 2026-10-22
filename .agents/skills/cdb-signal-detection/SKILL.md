---
name: cdb-signal-detection
description: >-
  Use this skill when the user wants to add a new signal detector, modify an
  existing one, add an NBA (Next Best Action) playbook for a signal, update the
  signal catalog, or write tests for signal detection logic in CDB.
---

# CDB Signal Detection — Adding / Modifying a Signal

## Architecture Overview

```
signals/catalog/         ← PostgreSQL dimension table + seed data
signals/detectors/       ← One subfolder per signal detector
  dormant/
  unanswered/
  contracts/
  competitors/
  growth/
  leadership/
signals/nba/             ← Next Best Action ranking & playbook logic
signals/orchestrator.py  ← Runs all detectors in sequence
signals/detector.py      ← Base Detector ABC
signals/__init__.py      ← exports detect_all_signals()
```

Full reference: [`signals/README.md`](../../src/backend/cdb/services/signals/README.md)

`Person.is_internal` and `is_last_speaker_host` use the single-organization policy in `cdb.core.internal_identity`. Explicit markers are `attributes.is_internal` and a tag containing `internal`. Email domains, exact member emails, and host-name tokens come from settings or a policy registered by the embedding process. Do not hardcode a personal name or an employer domain. Schema routing and tenant registries stay in CDB Hub.

---

## Step 1 — Add the Catalog Entry

The catalog is seeded into the `signals` dimension table.

1. Open `src/backend/cdb/services/signals/catalog/`.
2. Add an entry for the new signal following the existing pattern:

```python
SignalCatalogEntry(
    slug="my_new_signal",
    name="My New Signal",
    category=SignalCategory.OPPORTUNITY,        # or RISK / HYBRID
    target_entity=SignalTargetEntity.COMPANY,   # or PERSON / OPPORTUNITY / ENGAGEMENT
    severity=SignalSeverity.MEDIUM,             # HIGH / CRITICAL / LOW
    business_interpretation="...",
    recommended_action=RecommendedAction(
        playbook="...",
        title="...",
        description="...",
    ),
    parameters={},   # optional detector config (thresholds, etc.)
)
```

3. Run `ensure_signals_dimension(db)` (called at startup in `main.py`) to upsert it.

---

## Step 2 — Create the Detector Module

1. Create `src/backend/cdb/services/signals/detectors/<signal_slug>/`:
   - `__init__.py` — exports `MyNewSignalDetector`
   - `detector.py` — implements the detector

```python
# detector.py
from cdb.services.signals.detector import BaseDetector, DetectionResult
from sqlalchemy.ext.asyncio import AsyncSession

class MyNewSignalDetector(BaseDetector):
    slug = "my_new_signal"

    async def detect(self, db: AsyncSession) -> list[DetectionResult]:
        # Query the DB, apply rules, return DetectionResult list
        results = []
        # ... logic here ...
        return results
```

`DetectionResult` fields: `entity_id`, `entity_type`, `signal_slug`, `severity`, `metadata`.

2. Register the new detector in `src/backend/cdb/services/signals/detectors/__init__.py`:

```python
from .my_new_signal import MyNewSignalDetector
ALL_DETECTORS = [
    ...,
    MyNewSignalDetector(),
]
```

---

## Step 3 — Wire into the Orchestrator

Open `src/backend/cdb/services/signals/orchestrator.py` and confirm `ALL_DETECTORS` is imported
and iterated. No additional changes should be needed if you registered correctly in step 2.

---

## Step 4 — Add NBA Playbook (optional)

If the signal requires a ranked Next Best Action:
1. Open `src/backend/cdb/services/signals/nba/`.
2. Add a playbook entry mapping `signal_slug → playbook_config`.
3. Update `metrics.py` if the signal contributes to opportunity/risk scoring.

---

## Step 5 — Expose via API (if needed)

The signals API lives at `src/backend/cdb/api/v1/signals/`. Check if the new signal type
needs a custom filter endpoint; otherwise the generic `GET /api/v1/signals/detected` already
surfaces all results filtered by `signal_slug`, `entity_type`, and `severity`.

---

## Step 6 — Write Tests

Test location: `src/backend/tests/services/signals/test_<signal_slug>.py`

```python
import pytest
from cdb.services.signals.detectors.my_new_signal import MyNewSignalDetector

@pytest.mark.asyncio
async def test_detects_signal_when_condition_met(db_session):
    # Arrange: seed relevant entities
    # Act: await MyNewSignalDetector().detect(db_session)
    # Assert: result contains expected DetectionResult
    ...
```

---

## Step 7 — Verify & Lint

```bash
cd src/backend
ruff check --fix .
ruff format .
pytest tests/services/signals/
```

---

## Signal Catalog Reference

| Signal Slug | Category | Target | Severity |
|-------------|----------|--------|----------|
| `dormant_strategic_account` | risk | company | high |
| `unanswered_conversation` | risk | person | critical |
| `expiring_contract` | hybrid | engagement | high |
| `leadership_change` | hybrid | person | high |
| `hiring_funding_event` | opportunity | company | medium |
| `competitor_signal` | risk | opportunity | high |

Full signal definitions: [`signals/README.md`](../../src/backend/cdb/services/signals/README.md)
