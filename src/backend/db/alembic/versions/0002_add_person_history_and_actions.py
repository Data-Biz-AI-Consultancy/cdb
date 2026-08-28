"""0002_add_person_history_and_actions

Revision ID: 0002_add_person_history_and_actions
Revises: 0001_initial_schema
Create Date: 2026-08-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0002_add_person_history_and_actions'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_ACTIONS = [
    {
        "id": "record_created",
        "name": "Record Created",
        "category": "profile",
        "description": "Initial creation of the person golden record",
        "icon": "✨",
        "color": "emerald",
    },
    {
        "id": "profile_updated",
        "name": "Profile Updated",
        "category": "profile",
        "description": "Contact identity or direct fields updated",
        "icon": "✏️",
        "color": "blue",
    },
    {
        "id": "segment_changed",
        "name": "Segment Changed",
        "category": "segmentation",
        "description": "Contact segment classification updated",
        "icon": "🏷️",
        "color": "purple",
    },
    {
        "id": "temperature_changed",
        "name": "Temperature Changed",
        "category": "segmentation",
        "description": "Engagement temperature status updated",
        "icon": "🔥",
        "color": "amber",
    },
    {
        "id": "records_merged",
        "name": "Records Merged",
        "category": "entity_resolution",
        "description": "Merged with another duplicate record via entity resolution",
        "icon": "🔀",
        "color": "indigo",
    },
    {
        "id": "company_linked",
        "name": "Company Affiliation Changed",
        "category": "career",
        "description": "Company affiliation, role or tenure changed",
        "icon": "💼",
        "color": "cyan",
    },
    {
        "id": "lead_attached",
        "name": "Lead Attached",
        "category": "pipeline",
        "description": "Inbound lead attached to the person",
        "icon": "🎯",
        "color": "orange",
    },
    {
        "id": "lead_converted",
        "name": "Lead Converted",
        "category": "pipeline",
        "description": "Lead converted to an opportunity deal",
        "icon": "🚀",
        "color": "emerald",
    },
    {
        "id": "opportunity_attached",
        "name": "Opportunity Attached",
        "category": "pipeline",
        "description": "Sales opportunity or deal attached to the person",
        "icon": "💰",
        "color": "emerald",
    },
    {
        "id": "activity_logged",
        "name": "Activity Logged",
        "category": "pipeline",
        "description": "Interaction or message logged in person timeline",
        "icon": "💬",
        "color": "sky",
    },
    {
        "id": "bulk_updated",
        "name": "Bulk Updated",
        "category": "bulk_ops",
        "description": "Modified as part of a batch/bulk update operation",
        "icon": "🧹",
        "color": "slate",
    },
]


def upgrade() -> None:
    # 1. person_actions dimension table
    person_actions = op.create_table(
        'person_actions',
        sa.Column('id', sa.String(length=50), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('color', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_person_actions_category', 'person_actions', ['category'])

    # Seed initial actions
    op.bulk_insert(person_actions, SEED_ACTIONS)

    # 2. person_history fact/changelog table
    op.create_table(
        'person_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('person_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('persons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('action_id', sa.String(length=50), sa.ForeignKey('person_actions.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('changed_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('field_name', sa.String(length=100), nullable=True),
        sa.Column('old_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('new_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('changes', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_person_history_person_id', 'person_history', ['person_id'])
    op.create_index('idx_person_history_action_id', 'person_history', ['action_id'])
    op.create_index('idx_person_history_changed_by_id', 'person_history', ['changed_by_id'])
    op.create_index('idx_person_history_created_at', 'person_history', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_person_history_created_at', table_name='person_history')
    op.drop_index('idx_person_history_changed_by_id', table_name='person_history')
    op.drop_index('idx_person_history_action_id', table_name='person_history')
    op.drop_index('idx_person_history_person_id', table_name='person_history')
    op.drop_table('person_history')

    op.drop_index('idx_person_actions_category', table_name='person_actions')
    op.drop_table('person_actions')
