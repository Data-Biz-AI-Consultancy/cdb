"""0006_rename_intake_notion_summary_to_content

Revision ID: 0006_rename_intake_notion_summary_to_content
Revises: 0005_add_intake_msg_last_sent
Create Date: 2026-09-08 16:08:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "0006_rename_summary_to_content"
down_revision: Union[str, None] = "0005_add_intake_msg_last_sent"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "intake_notion_meeting_notes",
        "summary",
        new_column_name="content",
    )


def downgrade() -> None:
    op.alter_column(
        "intake_notion_meeting_notes",
        "content",
        new_column_name="summary",
    )
