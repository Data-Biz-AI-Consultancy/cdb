"""0005_add_intake_message_last_sent_at

Revision ID: 0005_add_intake_msg_last_sent
Revises: 0004_add_engagements
Create Date: 2026-09-04 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0005_add_intake_msg_last_sent'
down_revision: Union[str, None] = '0004_add_engagements'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'intake_linkedin_messages',
        sa.Column('last_sent_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index(
        'ix_intake_linkedin_messages_last_sent_at',
        'intake_linkedin_messages',
        ['last_sent_at'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_intake_linkedin_messages_last_sent_at', table_name='intake_linkedin_messages')
    op.drop_column('intake_linkedin_messages', 'last_sent_at')
