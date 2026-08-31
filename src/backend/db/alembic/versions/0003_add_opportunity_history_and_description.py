"""0003_opportunity_history_and_description

Revision ID: 0003_opp_history
Revises: 0002_person_history
Create Date: 2026-08-31 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0003_opp_history'
down_revision: Union[str, None] = '0002_person_history'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED_OPPORTUNITY_ACTIONS = [
    {
        "id": "opp_created",
        "name": "Opportunity Created",
        "category": "pipeline",
        "description": "Initial creation of the sales opportunity",
        "icon": "✨",
        "color": "emerald",
    },
    {
        "id": "stage_changed",
        "name": "Stage Changed",
        "category": "pipeline",
        "description": "Opportunity moved to a different sales stage",
        "icon": "🔄",
        "color": "blue",
    },
    {
        "id": "value_updated",
        "name": "Deal Value Updated",
        "category": "deal",
        "description": "Expected deal value or currency changed",
        "icon": "💰",
        "color": "amber",
    },
    {
        "id": "person_attached",
        "name": "Person Attached",
        "category": "contacts",
        "description": "Contact person linked to the opportunity",
        "icon": "👤",
        "color": "indigo",
    },
    {
        "id": "person_detached",
        "name": "Person Detached",
        "category": "contacts",
        "description": "Contact person unlinked from the opportunity",
        "icon": "🚫",
        "color": "rose",
    },
    {
        "id": "company_attached",
        "name": "Company Attached",
        "category": "contacts",
        "description": "Company organization linked to the opportunity",
        "icon": "🏢",
        "color": "cyan",
    },
    {
        "id": "company_detached",
        "name": "Company Detached",
        "category": "contacts",
        "description": "Company organization unlinked from the opportunity",
        "icon": "🏢",
        "color": "rose",
    },
    {
        "id": "deal_won",
        "name": "Deal Won",
        "category": "pipeline",
        "description": "Opportunity marked as Closed Won",
        "icon": "🏆",
        "color": "emerald",
    },
    {
        "id": "deal_lost",
        "name": "Deal Lost",
        "category": "pipeline",
        "description": "Opportunity marked as Closed Lost",
        "icon": "❌",
        "color": "rose",
    },
    {
        "id": "field_updated",
        "name": "Field Updated",
        "category": "deal",
        "description": "Opportunity attributes, description or dates updated",
        "icon": "✏️",
        "color": "slate",
    },
    {
        "id": "note_added",
        "name": "Note Added",
        "category": "activity",
        "description": "Activity log or note attached to opportunity",
        "icon": "📝",
        "color": "purple",
    },
]


def upgrade() -> None:
    # 1. Add description to opportunities
    op.add_column('opportunities', sa.Column('description', sa.Text(), nullable=True))

    # 2. opportunity_actions dimension table
    opportunity_actions = op.create_table(
        'opportunity_actions',
        sa.Column('id', sa.String(length=50), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('color', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_opportunity_actions_category', 'opportunity_actions', ['category'])

    # Seed initial opportunity actions
    op.bulk_insert(opportunity_actions, SEED_OPPORTUNITY_ACTIONS)

    # 3. opportunity_history fact/changelog table
    op.create_table(
        'opportunity_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('opportunity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('opportunities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('action_id', sa.String(length=50), sa.ForeignKey('opportunity_actions.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('changed_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('field_name', sa.String(length=100), nullable=True),
        sa.Column('old_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('new_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('changes', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_opportunity_history_opp_id', 'opportunity_history', ['opportunity_id'])
    op.create_index('idx_opportunity_history_action_id', 'opportunity_history', ['action_id'])
    op.create_index('idx_opportunity_history_changed_by_id', 'opportunity_history', ['changed_by_id'])
    op.create_index('idx_opportunity_history_created_at', 'opportunity_history', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_opportunity_history_created_at', table_name='opportunity_history')
    op.drop_index('idx_opportunity_history_changed_by_id', table_name='opportunity_history')
    op.drop_index('idx_opportunity_history_action_id', table_name='opportunity_history')
    op.drop_index('idx_opportunity_history_opp_id', table_name='opportunity_history')
    op.drop_table('opportunity_history')

    op.drop_index('idx_opportunity_actions_category', table_name='opportunity_actions')
    op.drop_table('opportunity_actions')

    op.drop_column('opportunities', 'description')
