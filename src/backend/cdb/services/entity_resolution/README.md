# CDB — Entity Resolution Engine

The **Entity Resolution (ER)** engine resolves whether two contact records across ingestion sources (LinkedIn, Notion, CSVs) represent the same real-world person or company.

For detailed matching hierarchies, algorithm scoring rules, and merge precedence, refer to the [Entity Resolution Skill](../../../../.agents/skills/cdb-entity-resolution/SKILL.md).

---

## 🏗️ Architecture & Pipeline

```
Raw Intake Records ──► Normalisation ──► Blocking ──► Rule Matching (Deterministic)
                                                              │
                                     ┌────────────────────────┴────────────────────────┐
                                     ▼                                                 ▼
                          High Confidence (Auto-Merge)                      Ambiguous (Review Queue)
                                     │                                                 │
                                     ▼                                                 ▼
                          Direct Master Update                             `er_candidate_pairs` (Pending)
```

### Outcomes:
1. **Auto-Merge**: Deterministic rule match (exact email, LinkedIn URL, phone, or name + domain). Updates master record immediately.
2. **Review Queue**: Ambiguous candidate pairs (name similarity or ML composite score 0.65–0.84) are staged in `er_candidate_pairs` for user approval.
3. **No Match**: Unmatched records create a new master `Person`.

---

## 📁 Module Structure

All ER service logic lives in `src/backend/cdb/services/entity_resolution/`:

| Module | Purpose | Source File |
|--------|---------|-------------|
| **Normalisation** | Cleans emails, LinkedIn URLs, phone numbers, and text tokens | [`normalise.py`](normalise.py) |
| **Rule Matching** | Evaluates deterministic signal hierarchy & blocking keys | [`rules.py`](rules.py) |
| **Merger & Precedence** | Re-links foreign keys and merges contact attributes | [`merger.py`](merger.py) |
| **ML Scorer** | Probabilistic composite scoring (Jaro-Winkler) fallback | [`ml_scorer.py`](ml_scorer.py) |
| **Service Entrypoint** | Orchestrates incremental & batch deduplication | [`service.py`](service.py) |

---

## 🧪 Testing

Run the automated ER test suite:

```bash
cd src/backend
uv run pytest tests/services/entity_resolution/ -v
```
