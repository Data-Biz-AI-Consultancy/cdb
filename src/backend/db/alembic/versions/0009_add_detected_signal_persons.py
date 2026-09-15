"""0009_add_detected_signal_persons

Revision ID: 0009_add_detected_signal_persons
Revises: 0008_add_detected_signals_table
Create Date: 2026-09-14 17:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0009_add_detected_signal_persons"
down_revision: Union[str, None] = "0008_add_detected_signals_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "detected_signal_persons",
        sa.Column(
            "detected_signal_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("detected_signals.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "person_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("persons.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.String(length=64),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_detected_signal_persons_person_id",
        "detected_signal_persons",
        ["person_id"],
    )

    # Backfill existing primary person links
    op.execute(
        sa.text(
            """
            INSERT INTO detected_signal_persons (detected_signal_id, person_id, role, created_at)
            SELECT id, person_id, 'primary', created_at
            FROM detected_signals
            WHERE person_id IS NOT NULL
            ON CONFLICT DO NOTHING;
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_detected_signal_persons_person_id", table_name="detected_signal_persons")
    op.drop_table("detected_signal_persons")
