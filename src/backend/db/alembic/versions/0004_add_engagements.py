"""0004_add_engagements

Revision ID: 0004_add_engagements
Revises: 0003_opp_history
Create Date: 2026-09-01 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0004_add_engagements'
down_revision: Union[str, None] = '0003_opp_history'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create engagements table
    op.create_table(
        'engagements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('opportunity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('opportunities.id', ondelete='SET NULL'), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='active'),
        sa.Column('engagement_type', sa.String(length=50), nullable=False, server_default='consultancy'),
        sa.Column('rate_type', sa.String(length=50), nullable=False, server_default='daily'),
        sa.Column('rate_value', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='USD'),
        sa.Column('total_value', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('contract_ref', sa.String(length=512), nullable=True),
        sa.Column('contract_status', sa.String(length=50), nullable=False, server_default='signed'),
        sa.Column('signed_at', sa.Date(), nullable=True),
        sa.Column('terms_and_conditions', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('expected_end_date', sa.Date(), nullable=True),
        sa.Column('actual_end_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('attributes', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_engagements_company_id', 'engagements', ['company_id'])
    op.create_index('idx_engagements_opportunity_id', 'engagements', ['opportunity_id'])
    op.create_index('idx_engagements_owner_id', 'engagements', ['owner_id'])
    op.create_index('idx_engagements_status', 'engagements', ['status'])
    op.create_index('idx_engagements_type', 'engagements', ['engagement_type'])
    op.create_index('idx_engagements_expected_end_date', 'engagements', ['expected_end_date'])

    # 2. Create engagement_persons association table
    op.create_table(
        'engagement_persons',
        sa.Column('engagement_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('engagements.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('person_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('persons.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # 3. Add engagement_id to activities table
    op.add_column('activities', sa.Column('engagement_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('engagements.id', ondelete='SET NULL'), nullable=True))
    op.create_index('idx_activities_engagement_id', 'activities', ['engagement_id'])


def downgrade() -> None:
    op.drop_index('idx_activities_engagement_id', table_name='activities')
    op.drop_column('activities', 'engagement_id')
    op.drop_table('engagement_persons')
    op.drop_index('idx_engagements_expected_end_date', table_name='engagements')
    op.drop_index('idx_engagements_type', table_name='engagements')
    op.drop_index('idx_engagements_status', table_name='engagements')
    op.drop_index('idx_engagements_owner_id', table_name='engagements')
    op.drop_index('idx_engagements_opportunity_id', table_name='engagements')
    op.drop_index('idx_engagements_company_id', table_name='engagements')
    op.drop_table('engagements')
