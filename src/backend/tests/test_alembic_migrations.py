import importlib.util
from pathlib import Path

from cdb.models.signal import DetectedSignal


def test_alembic_revision_identifiers_length_and_uniqueness():
    """
    Ensures that all Alembic migration revision identifiers are <= 32 characters
    (standard PostgreSQL alembic_version column limit) and uniquely identified.
    """
    versions_dir = Path(__file__).resolve().parent.parent / "db" / "alembic" / "versions"
    assert versions_dir.exists(), f"Alembic versions dir not found at {versions_dir}"

    migration_files = sorted(versions_dir.glob("*.py"))
    assert len(migration_files) >= 12, "Expected at least 12 migration files"

    revisions = {}
    down_revisions = set()

    for py_file in migration_files:
        spec = importlib.util.spec_from_file_location(py_file.stem, py_file)
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        rev = getattr(module, "revision", None)
        down_rev = getattr(module, "down_revision", None)

        assert rev is not None, f"Migration {py_file.name} missing 'revision' identifier"
        # Standard PostgreSQL alembic_version default column is VARCHAR(32)
        assert len(rev) <= 32, (
            f"Migration {py_file.name} revision '{rev}' exceeds 32 characters (len={len(rev)})."
        )

        assert rev not in revisions, f"Duplicate revision ID '{rev}' found in {py_file.name}"
        revisions[rev] = down_rev
        if down_rev:
            down_revisions.add(down_rev)

    # Verify linear history (all down_revisions exist, single initial, single head)
    initial_revisions = [rev for rev, down_rev in revisions.items() if down_rev is None]
    assert len(initial_revisions) == 1, (
        f"Expected exactly 1 root migration, found: {initial_revisions}"
    )

    head_revisions = [rev for rev in revisions if rev not in down_revisions]
    assert len(head_revisions) == 1, f"Expected exactly 1 head migration, found: {head_revisions}"
    assert head_revisions[0] == "0012_signal_ownership_routing"


def test_detected_signals_model_column_parity():
    """
    Guarantees that all columns defined on DetectedSignal SQLAlchemy model
    exist in the schema specifications and migration definitions, including
    the new ownership, escalation, and routing columns.
    """
    model_columns = {col.name for col in DetectedSignal.__table__.columns}

    expected_critical_columns = {
        "id",
        "signal_id",
        "company_id",
        "person_id",
        "opportunity_id",
        "engagement_id",
        "activity_id",
        "status",
        "severity",
        "score",
        "title",
        "summary",
        "metadata",
        "evidence_fingerprint",
        "reopen_count",
        "last_reopened_at",
        "snoozed_until",
        "actioned_at",
        "actioned_by_id",
        "resolution_notes",
        "owner_id",
        "assigned_at",
        "assigned_by_id",
        "is_escalated",
        "escalation_level",
        "escalated_to_id",
        "escalated_at",
        "escalation_reason",
        "routed_opportunity_id",
        "routed_workflow_type",
        "routed_at",
        "detected_at",
        "expires_at",
        "created_at",
        "updated_at",
    }

    # Verify all expected columns exist on the SQLAlchemy model
    missing_from_model = expected_critical_columns - model_columns
    assert not missing_from_model, f"DetectedSignal model is missing columns: {missing_from_model}"

    # Load 0012 migration and verify it adds all the ownership & routing columns
    migration_0012_path = (
        Path(__file__).resolve().parent.parent
        / "db"
        / "alembic"
        / "versions"
        / "0012_signal_ownership_routing.py"
    )
    content = migration_0012_path.read_text()

    ownership_and_routing_fields = [
        "owner_id",
        "assigned_at",
        "assigned_by_id",
        "is_escalated",
        "escalation_level",
        "escalated_to_id",
        "escalated_at",
        "escalation_reason",
        "routed_opportunity_id",
        "routed_workflow_type",
        "routed_at",
    ]

    for field in ownership_and_routing_fields:
        assert f'"{field}"' in content or f"'{field}'" in content, (
            f"0012 migration missing column definition for '{field}'"
        )
