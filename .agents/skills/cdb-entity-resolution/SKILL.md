---
name: cdb-entity-resolution
description: >-
  Use this skill when working on CDB's Entity Resolution (ER) engine: normalising
  contact identifiers (email, LinkedIn URLs, phone numbers, names), configuring rule-based
  matching hierarchy, handling auto-merge vs review queue (`er_candidate_pairs`),
  tuning the ML/probabilistic scorer (Jaro-Winkler), or testing merge precedence.
---

# CDB Entity Resolution (ER) Engine Guide

The Entity Resolution engine answers: **are record A and record B the same real-world person or company?**

Source files:
- Normalisation: [`src/backend/cdb/services/entity_resolution/normalise.py`](../../src/backend/cdb/services/entity_resolution/normalise.py)
- Rule Engine: [`src/backend/cdb/services/entity_resolution/rules.py`](../../src/backend/cdb/services/entity_resolution/rules.py)
- Merger & Precedence: [`src/backend/cdb/services/entity_resolution/merger.py`](../../src/backend/cdb/services/entity_resolution/merger.py)
- ML / Probabilistic Scorer: [`src/backend/cdb/services/entity_resolution/ml_scorer.py`](../../src/backend/cdb/services/entity_resolution/ml_scorer.py)
- Service Entrypoint: [`src/backend/cdb/services/entity_resolution/service.py`](../../src/backend/cdb/services/entity_resolution/service.py)
- Candidate Model: [`src/backend/cdb/models/er.py`](../../src/backend/cdb/models/er.py)

---

## 1. Resolution Outcomes

| Outcome | Condition | System Action |
|---------|-----------|---------------|
| **Auto-merge** | High-confidence deterministic rule match (Rank 1–4) | Merges attributes immediately into master `Person` record |
| **Review Queue** | Medium-confidence / Ambiguous match (Rank 5–7 or ML score 0.65–0.84) | Inserts row into `er_candidate_pairs` table with `status="pending"` for user confirmation |
| **No Match** | Below threshold (< 0.65) / No signal overlap | Creates brand new master `Person` record |

---

## 2. Signal Normalisation Rules

All fields must be strictly normalised via `normalise.py` before comparison:

1. **Email** (`normalise_email`): Lowercase, stripped. Drop invalid placeholders (`@linkedin.user`, `invalid`).
2. **LinkedIn URL** (`normalise_linkedin_url`): Strip protocol (`https://`), `www.`, trailing slashes, query params. Must match `linkedin.com/in/*`.
3. **Phone** (`normalise_phone`): Strip all non-digits except leading `+`. Reject if length < 7 digits.
4. **Name** (`normalise_name`): Lowercase, strip punctuation and extra whitespace.
5. **Company Name** (`clean_company_name`): Strip legal suffixes (`Inc`, `LLC`, `GmbH`, `Ltd`, `AG`, `Oy`), lowercase.
6. **Company Domain** (`generate_company_domain`): Extract root domain from URL or corporate email host.

---

## 3. Rule Matching Hierarchy (Precedence Order)

When evaluating candidate pairs in `rules.py`:

```
Rank 1: Exact Email Match                → AUTO-MERGE (Confidence: 1.00)
Rank 2: Exact LinkedIn Profile URL       → AUTO-MERGE (Confidence: 0.98)
Rank 3: Exact Phone + First Name Match    → AUTO-MERGE (Confidence: 0.95)
Rank 4: Exact Full Name + Company Domain → AUTO-MERGE (Confidence: 0.90)
Rank 5: Exact Full Name + Clean Company  → REVIEW QUEUE (Confidence: 0.80)
Rank 6: Email Prefix + Full Name         → REVIEW QUEUE (Confidence: 0.75)
Rank 7: ML / Jaro-Winkler Composite >=0.75 → REVIEW QUEUE (Confidence: Score)
Else:   No Match                         → CREATE NEW RECORD
```

---

## 4. Attribute Merge Precedence

When auto-merging or user-approving a merge in `merger.py`:
- **Source Reliability Hierarchy**: `manual_input` > `notion_meeting_notes` > `linkedin_connections` > `inferred_enrichment`.
- **Arrays (`sources`)**: Union of unique source tags.
- **JSONB (`source_ids`)**: Merged dictionary keeping the latest external IDs per source.
- **Timestamps**: Preserve earliest `created_at`, update `updated_at`.
- **Relationships & Activities**: Re-point foreign keys (`person_id`, `company_id`) from duplicate to master record before deleting duplicate.

---

## 5. Testing & Verification

Run the dedicated ER test suite:

```bash
cd src/backend
pytest tests/services/entity_resolution/ -v
```

Linting & typecheck:
```bash
cd src/backend
ruff check cdb/services/entity_resolution/
ruff format --check cdb/services/entity_resolution/
```
