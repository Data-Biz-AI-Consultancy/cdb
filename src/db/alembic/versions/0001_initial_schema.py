"""0001_initial_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-20 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_pw', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('role', sa.String(length=32), nullable=False, server_default='member'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_users_email', 'users', ['email'], unique=True)

    # 2. persons
    op.create_table(
        'persons',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('first_name', sa.String(length=255), nullable=True),
        sa.Column('last_name', sa.String(length=255), nullable=True),
        sa.Column('primary_email', sa.String(length=255), nullable=True),
        sa.Column('secondary_emails', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('primary_phone', sa.String(length=100), nullable=True),
        sa.Column('linkedin_url', sa.String(length=2048), nullable=True),
        sa.Column('twitter_handle', sa.String(length=255), nullable=True),
        sa.Column('facebook_id', sa.String(length=255), nullable=True),
        sa.Column('whatsapp_phone', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=255), nullable=True),
        sa.Column('country', sa.String(length=2), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('attributes', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('sources', postgresql.ARRAY(sa.Text()), nullable=False, server_default='{}'),
        sa.Column('source_ids', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_persons_primary_email', 'persons', ['primary_email'], unique=True)
    op.create_index('idx_persons_linkedin_url', 'persons', ['linkedin_url'], unique=True)
    op.create_index('idx_persons_deleted_at', 'persons', ['deleted_at'])
    # Full-text search GIN index
    op.execute(
        "CREATE INDEX idx_persons_fts ON persons USING gin("
        "to_tsvector('english', coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || coalesce(primary_email, '')))"
    )

    # 3. companies
    op.create_table(
        'companies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=True),
        sa.Column('industry', sa.String(length=255), nullable=True),
        sa.Column('size_range', sa.String(length=50), nullable=True),
        sa.Column('country', sa.String(length=2), nullable=True),
        sa.Column('city', sa.String(length=255), nullable=True),
        sa.Column('linkedin_url', sa.String(length=2048), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('attributes', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_companies_domain', 'companies', ['domain'], unique=True)
    op.create_index('idx_companies_deleted_at', 'companies', ['deleted_at'])
    # Full-text search GIN index
    op.execute(
        "CREATE INDEX idx_companies_fts ON companies USING gin("
        "to_tsvector('english', coalesce(name, '') || ' ' || coalesce(domain, '')))"
    )

    # 4. person_company_relationships
    op.create_table(
        'person_company_relationships',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('person_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('persons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('started_at', sa.Date(), nullable=True),
        sa.Column('ended_at', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.UniqueConstraint('person_id', 'company_id', 'title', name='uq_pcr_person_company_title')
    )
    op.create_index('idx_pcr_person_id', 'person_company_relationships', ['person_id'])
    op.create_index('idx_pcr_company_id', 'person_company_relationships', ['company_id'])
    op.create_index('idx_pcr_is_current', 'person_company_relationships', ['is_current'])

    # 5. activities
    op.create_table(
        'activities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('person_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('persons.id', ondelete='SET NULL'), nullable=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='SET NULL'), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('source', sa.String(length=100), nullable=False),
        sa.Column('source_id', sa.String(length=512), nullable=True),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('title', sa.String(length=1024), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('raw_content', sa.Text(), nullable=True),
        sa.Column('attributes', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.CheckConstraint('person_id IS NOT NULL OR company_id IS NOT NULL', name='ck_activities_person_or_company_required')
    )
    op.create_index('idx_activities_person_id', 'activities', ['person_id'])
    op.create_index('idx_activities_company_id', 'activities', ['company_id'])
    op.create_index('idx_activities_occurred_at', 'activities', ['occurred_at'])
    op.create_index('idx_activities_source_id', 'activities', ['source_id'], unique=True)
    op.create_index('idx_activities_type', 'activities', ['type'])

    # 6. opportunities
    op.create_table(
        'opportunities',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('title', sa.String(length=512), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('stage', sa.String(length=50), nullable=False, server_default='prospect'),
        sa.Column('value', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=True),
        sa.Column('probability', sa.SmallInteger(), nullable=True),
        sa.Column('expected_close_date', sa.Date(), nullable=True),
        sa.Column('source_lead_id', postgresql.UUID(as_uuid=True), nullable=True), # FK added below after leads
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('attributes', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.CheckConstraint('probability BETWEEN 0 AND 100', name='ck_opportunities_probability_range')
    )
    op.create_index('idx_opportunities_owner_id', 'opportunities', ['owner_id'])
    op.create_index('idx_opportunities_stage', 'opportunities', ['stage'])

    # 7. leads
    op.create_table(
        'leads',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('person_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('persons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='SET NULL'), nullable=True),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('stage', sa.String(length=50), nullable=False, server_default='new'),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('source_ref_id', sa.String(length=512), nullable=True),
        sa.Column('intent', sa.String(length=255), nullable=True),
        sa.Column('signal_strength', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('disqualification_reason', sa.String(length=255), nullable=True),
        sa.Column('converted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('converted_opportunity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('opportunities.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_leads_person_id', 'leads', ['person_id'])
    op.create_index('idx_leads_company_id', 'leads', ['company_id'])
    op.create_index('idx_leads_stage', 'leads', ['stage'])
    op.create_index('idx_leads_owner_id', 'leads', ['owner_id'])

    # Add foreign key from opportunities.source_lead_id -> leads.id
    op.create_foreign_key('fk_opportunities_source_lead_id', 'opportunities', 'leads', ['source_lead_id'], ['id'], ondelete='SET NULL')

    # 8. opportunity_persons
    op.create_table(
        'opportunity_persons',
        sa.Column('opportunity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('opportunities.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('person_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('persons.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role', sa.String(length=255), nullable=True),
    )

    # 9. opportunity_companies
    op.create_table(
        'opportunity_companies',
        sa.Column('opportunity_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('opportunities.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role', sa.String(length=255), nullable=True),
    )

    # 10. intake_linkedin_connections
    op.create_table(
        'intake_linkedin_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('connection_id', sa.String(length=512), nullable=False),
        sa.Column('first_name', sa.String(length=255), nullable=True),
        sa.Column('last_name', sa.String(length=255), nullable=True),
        sa.Column('profile_url', sa.String(length=2048), nullable=True),
        sa.Column('email_address', sa.String(length=255), nullable=True),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('position', sa.String(length=255), nullable=True),
        sa.Column('connected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('raw_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('resolved_person_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('persons.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ingested_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_intake_linkedin_connections_id', 'intake_linkedin_connections', ['connection_id'], unique=True)

    # 11. intake_linkedin_messages
    op.create_table(
        'intake_linkedin_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('conversation_id', sa.String(length=512), nullable=False),
        sa.Column('participant_names', sa.Text(), nullable=True),
        sa.Column('message_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('raw_content', sa.Text(), nullable=True),
        sa.Column('raw_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('resolved_person_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('persons.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ingested_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_intake_linkedin_messages_id', 'intake_linkedin_messages', ['conversation_id'], unique=True)

    # 12. intake_notion_meeting_notes
    op.create_table(
        'intake_notion_meeting_notes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('page_id', sa.String(length=512), nullable=False),
        sa.Column('database_name', sa.String(length=255), nullable=True),
        sa.Column('title', sa.String(length=1024), nullable=True),
        sa.Column('meeting_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('attendees', sa.Text(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('to_dos', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('raw_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('ingested_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_intake_notion_page_id', 'intake_notion_meeting_notes', ['page_id'], unique=True)

    # 13. intake_manual
    op.create_table(
        'intake_manual',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('upload_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_label', sa.String(length=255), nullable=True),
        sa.Column('entity_type', sa.String(length=50), nullable=False, server_default='person'),
        sa.Column('raw_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('resolved_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('ingested_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    op.create_index('idx_intake_manual_upload_id', 'intake_manual', ['upload_id'])

    # 14. er_candidate_pairs
    op.create_table(
        'er_candidate_pairs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('person_a_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('persons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('person_b_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('persons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('match_signals', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('ml_score', sa.Numeric(precision=4, scale=3), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.UniqueConstraint('person_a_id', 'person_b_id', name='uq_er_candidate_pairs_a_b'),
        sa.CheckConstraint('person_a_id <> person_b_id', name='ck_er_candidate_pairs_different_persons')
    )
    op.create_index('idx_er_pairs_status', 'er_candidate_pairs', ['status'])


def downgrade() -> None:
    op.drop_table('er_candidate_pairs')
    op.drop_table('intake_manual')
    op.drop_table('intake_notion_meeting_notes')
    op.drop_table('intake_linkedin_messages')
    op.drop_table('intake_linkedin_connections')
    op.drop_table('opportunity_companies')
    op.drop_table('opportunity_persons')
    op.drop_constraint('fk_opportunities_source_lead_id', 'opportunities', type_='foreignkey')
    op.drop_table('leads')
    op.drop_table('opportunities')
    op.drop_table('activities')
    op.drop_table('person_company_relationships')
    op.drop_table('companies')
    op.drop_table('persons')
    op.drop_table('users')
