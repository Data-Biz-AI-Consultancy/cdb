"""0012_signal_ownership_routing

Revision ID: 0012_signal_ownership_routing
Revises: 0011_signal_quality_feedback
Create Date: 2026-09-24 09:15:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic (must be <= 32 chars for standard postgres alembic_version column).
revision: str = "0012_signal_ownership_routing"
down_revision: Union[str, None] = "0011_signal_quality_feedback"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add ownership columns
    op.add_column(
        "detected_signals",
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "detected_signals",
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "detected_signals",
        sa.Column("assigned_by_id", postgresql.UUID(as_uuid=True), nullable=True),
    )

    # Add escalation columns
    op.add_column(
        "detected_signals",
        sa.Column("is_escalated", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "detected_signals",
        sa.Column("escalation_level", sa.String(length=32), nullable=False, server_default="none"),
    )
    op.add_column(
        "detected_signals",
        sa.Column("escalated_to_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "detected_signals",
        sa.Column("escalated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "detected_signals",
        sa.Column("escalation_reason", sa.Text(), nullable=True),
    )

    # Add workflow routing columns
    op.add_column(
        "detected_signals",
        sa.Column("routed_opportunity_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "detected_signals",
        sa.Column("routed_workflow_type", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "detected_signals",
        sa.Column("routed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Add Foreign Keys
    op.create_foreign_key(
        "fk_detected_signals_owner_id_users",
        "detected_signals",
        "users",
        ["owner_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_detected_signals_assigned_by_id_users",
        "detected_signals",
        "users",
        ["assigned_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_detected_signals_escalated_to_id_users",
        "detected_signals",
        "users",
        ["escalated_to_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_detected_signals_routed_opportunity_id_opportunities",
        "detected_signals",
        "opportunities",
        ["routed_opportunity_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create Indexes
    op.create_index(
        "ix_detected_signals_owner_id",
        "detected_signals",
        ["owner_id"],
    )
    op.create_index(
        "ix_detected_signals_is_escalated",
        "detected_signals",
        ["is_escalated"],
    )
    op.create_index(
        "ix_detected_signals_routed_opportunity_id",
        "detected_signals",
        ["routed_opportunity_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_detected_signals_routed_opportunity_id", table_name="detected_signals")
    op.drop_index("ix_detected_signals_is_escalated", table_name="detected_signals")
    op.drop_index("ix_detected_signals_owner_id", table_name="detected_signals")

    op.drop_constraint("fk_detected_signals_routed_opportunity_id_opportunities", "detected_signals", type_="foreignkey")
    op.drop_constraint("fk_detected_signals_escalated_to_id_users", "detected_signals", type_="foreignkey")
    op.drop_constraint("fk_detected_signals_assigned_by_id_users", "detected_signals", type_="foreignkey")
    op.drop_constraint("fk_detected_signals_owner_id_users", "detected_signals", type_="foreignkey")

    op.drop_column("detected_signals", "routed_at")
    op.drop_column("detected_signals", "routed_workflow_type")
    op.drop_column("detected_signals", "routed_opportunity_id")
    op.drop_column("detected_signals", "escalation_reason")
    op.drop_column("detected_signals", "escalated_at")
    op.drop_column("detected_signals", "escalated_to_id")
    op.drop_column("detected_signals", "escalation_level")
    op.drop_column("detected_signals", "is_escalated")
    op.drop_column("detected_signals", "assigned_by_id")
    op.drop_column("detected_signals", "assigned_at")
    op.drop_column("detected_signals", "owner_id")
