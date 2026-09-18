"""0010_add_signal_dedup_and_snooze

Revision ID: 0010_add_signal_dedup_and_snooze
Revises: 0009_add_detected_signal_persons
Create Date: 2026-09-18 16:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0010_add_signal_dedup_and_snooze"
down_revision: Union[str, None] = "0009_add_detected_signal_persons"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "detected_signals",
        sa.Column("snoozed_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "detected_signals",
        sa.Column("evidence_fingerprint", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "detected_signals",
        sa.Column("reopen_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "detected_signals",
        sa.Column("last_reopened_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index(
        "ix_detected_signals_snoozed_until",
        "detected_signals",
        ["snoozed_until"],
    )
    op.create_index(
        "ix_detected_signals_evidence_fingerprint",
        "detected_signals",
        ["evidence_fingerprint"],
    )
    op.create_index(
        "ix_detected_signals_lookup_company",
        "detected_signals",
        ["signal_id", "company_id", "status"],
    )
    op.create_index(
        "ix_detected_signals_lookup_person",
        "detected_signals",
        ["signal_id", "person_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_detected_signals_lookup_person", table_name="detected_signals")
    op.drop_index("ix_detected_signals_lookup_company", table_name="detected_signals")
    op.drop_index("ix_detected_signals_evidence_fingerprint", table_name="detected_signals")
    op.drop_index("ix_detected_signals_snoozed_until", table_name="detected_signals")

    op.drop_column("detected_signals", "last_reopened_at")
    op.drop_column("detected_signals", "reopen_count")
    op.drop_column("detected_signals", "evidence_fingerprint")
    op.drop_column("detected_signals", "snoozed_until")
