"""0008_add_detected_signals_table

Revision ID: 0008_add_detected_signals_table
Revises: 0007_add_signals_dimension_table
Create Date: 2026-09-09 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0008_add_detected_signals_table"
down_revision: Union[str, None] = "0007_add_signals_dimension_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "detected_signals",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "signal_id",
            sa.String(length=50),
            sa.ForeignKey("signals.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "person_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("persons.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "opportunity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("opportunities.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "engagement_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("engagements.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "activity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("activities.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="active",
        ),  # 'active' | 'acknowledged' | 'actioned' | 'dismissed' | 'resolved'
        sa.Column(
            "severity",
            sa.String(length=50),
            nullable=False,
            server_default="medium",
        ),  # 'critical' | 'high' | 'medium' | 'low'
        sa.Column("score", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("actioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "actioned_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("resolution_notes", sa.Text(), nullable=True),
        sa.Column(
            "detected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "company_id IS NOT NULL OR person_id IS NOT NULL OR opportunity_id IS NOT NULL OR engagement_id IS NOT NULL",
            name="ck_detected_signals_target_required",
        ),
    )

    op.create_index("idx_detected_signals_signal_id", "detected_signals", ["signal_id"])
    op.create_index("idx_detected_signals_status", "detected_signals", ["status"])
    op.create_index("idx_detected_signals_severity", "detected_signals", ["severity"])
    op.create_index("idx_detected_signals_company_id", "detected_signals", ["company_id"])
    op.create_index("idx_detected_signals_person_id", "detected_signals", ["person_id"])
    op.create_index("idx_detected_signals_opportunity_id", "detected_signals", ["opportunity_id"])
    op.create_index("idx_detected_signals_engagement_id", "detected_signals", ["engagement_id"])
    op.create_index("idx_detected_signals_activity_id", "detected_signals", ["activity_id"])
    op.create_index("idx_detected_signals_detected_at", "detected_signals", ["detected_at"])


def downgrade() -> None:
    op.drop_index("idx_detected_signals_detected_at", table_name="detected_signals")
    op.drop_index("idx_detected_signals_activity_id", table_name="detected_signals")
    op.drop_index("idx_detected_signals_engagement_id", table_name="detected_signals")
    op.drop_index("idx_detected_signals_opportunity_id", table_name="detected_signals")
    op.drop_index("idx_detected_signals_person_id", table_name="detected_signals")
    op.drop_index("idx_detected_signals_company_id", table_name="detected_signals")
    op.drop_index("idx_detected_signals_severity", table_name="detected_signals")
    op.drop_index("idx_detected_signals_status", table_name="detected_signals")
    op.drop_index("idx_detected_signals_signal_id", table_name="detected_signals")
    op.drop_table("detected_signals")
