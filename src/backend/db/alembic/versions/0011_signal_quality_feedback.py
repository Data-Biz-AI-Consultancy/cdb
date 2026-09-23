"""0011_signal_quality_feedback

Revision ID: 0011_signal_quality_feedback
Revises: 0010_add_signal_dedup_and_snooze
Create Date: 2026-09-23 18:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0011_signal_quality_feedback"
down_revision: Union[str, None] = "0010_add_signal_dedup_and_snooze"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create signal_feedback table
    op.create_table(
        "signal_feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("detected_signal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_false_positive", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("feedback_reason", sa.String(length=64), nullable=False),
        sa.Column("feedback_notes", sa.Text(), nullable=True),
        sa.Column("suggested_action", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("investigated_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("investigation_notes", sa.Text(), nullable=True),
        sa.Column("investigated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["detected_signal_id"],
            ["detected_signals.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["investigated_by_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_signal_feedback_detected_signal_id",
        "signal_feedback",
        ["detected_signal_id"],
    )
    op.create_index(
        "ix_signal_feedback_status",
        "signal_feedback",
        ["status"],
    )
    op.create_index(
        "ix_signal_feedback_reason_status",
        "signal_feedback",
        ["feedback_reason", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_signal_feedback_reason_status", table_name="signal_feedback")
    op.drop_index("ix_signal_feedback_status", table_name="signal_feedback")
    op.drop_index("ix_signal_feedback_detected_signal_id", table_name="signal_feedback")
    op.drop_table("signal_feedback")
