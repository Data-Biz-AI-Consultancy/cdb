import json
import sys
import uuid
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy import text

# Add repo root to sys.path so we can import scripts.migrate_cdp_to_cdb
from cdb.services.migration import (
    DataMigrator,
    map_lead_stage,
    normalise_email,
    normalise_linkedin_url,
    normalise_phone,
)


def test_map_lead_stage():
    assert map_lead_stage("prospect") == "new"
    assert map_lead_stage("reached") == "contacted"
    assert map_lead_stage("decision_maker_reached") == "qualified"
    assert map_lead_stage("engaging") == "qualified"
    assert map_lead_stage("contract_signed") == "converted"
    assert map_lead_stage("completed") == "converted"
    assert map_lead_stage("closed", signal_strength="strong") == "converted"
    assert map_lead_stage("closed", signal_strength="low") == "disqualified"
    assert map_lead_stage("unknown_status") == "new"


def test_normalisers():
    assert normalise_email(" Test.User@Domain.COM ") == "test.user@domain.com"
    assert normalise_email("invalid_email") is None
    assert normalise_email("user@linkedin.user") is None

    assert normalise_linkedin_url("https://www.linkedin.com/in/jimmypang/") == "linkedin.com/in/jimmypang"
    assert normalise_linkedin_url("http://linkedin.com/in/jimmypang") == "linkedin.com/in/jimmypang"
    assert normalise_linkedin_url("https://not-linkedin.com/in/foo") is None

    assert normalise_phone("+1 (555) 123-4567") == "+15551234567"
    assert normalise_phone("555-1234") == "5551234"
    assert normalise_phone("123") is None


def test_migrator_end_to_end(tmp_path):
    """
    End-to-end SQLite in-memory/file simulation for DataMigrator.
    Verifies data mapping, origin ID tracking, FK relinking, and idempotency.
    """
    src_db_file = tmp_path / "source_cdp.db"
    tgt_db_file = tmp_path / "target_cdb.db"

    src_url = f"sqlite:///{src_db_file}"
    tgt_url = f"sqlite:///{tgt_db_file}"

    src_engine = sa.create_engine(src_url)
    tgt_engine = sa.create_engine(tgt_url)

    # 1. Setup Source Schema and mock records
    with src_engine.begin() as conn:
        conn.execute(
            text("""
                CREATE TABLE companies (
                    id TEXT PRIMARY KEY,
                    company_name TEXT,
                    domain TEXT,
                    attributes TEXT,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE persons (
                    id TEXT PRIMARY KEY,
                    first_name TEXT,
                    last_name TEXT,
                    primary_email TEXT,
                    primary_phone TEXT,
                    linkedin_url TEXT,
                    city TEXT,
                    country TEXT,
                    in_linkedin_connections BOOLEAN,
                    in_substack_subscriber_export BOOLEAN,
                    primary_company_id TEXT,
                    attributes TEXT,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE person_company_relationships (
                    id TEXT PRIMARY KEY,
                    person_id TEXT,
                    company_id TEXT,
                    role TEXT,
                    is_current BOOLEAN,
                    started_at DATE,
                    ended_at DATE,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE persons_linkedins (
                    connection_id TEXT PRIMARY KEY,
                    first_name TEXT,
                    last_name TEXT,
                    profile_url TEXT,
                    email_address TEXT,
                    company TEXT,
                    position TEXT,
                    connected_at TIMESTAMP,
                    raw_payload TEXT
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE leads_linkedin (
                    conversation_id TEXT PRIMARY KEY,
                    person_id TEXT,
                    full_name TEXT,
                    message_count INTEGER,
                    convo_history TEXT,
                    raw_payload TEXT
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE activities_notion_meeting_notes (
                    page_id TEXT PRIMARY KEY,
                    database_name TEXT,
                    title TEXT,
                    meeting_date TIMESTAMP,
                    attendees TEXT,
                    summary_or_content TEXT,
                    to_dos TEXT,
                    url TEXT,
                    raw_payload TEXT
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE activities (
                    id TEXT PRIMARY KEY,
                    activity_type TEXT,
                    source TEXT,
                    source_id TEXT UNIQUE,
                    person_id TEXT,
                    company_id TEXT,
                    title TEXT,
                    activity_date TIMESTAMP,
                    summary_or_content TEXT,
                    participants TEXT,
                    to_dos TEXT,
                    url TEXT,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE leads (
                    id TEXT PRIMARY KEY,
                    person_id TEXT,
                    company_id TEXT,
                    status TEXT,
                    source TEXT,
                    intent TEXT,
                    signal_strength TEXT,
                    summary TEXT,
                    message_count INTEGER,
                    convo_history TEXT,
                    opportunity_type TEXT,
                    rate TEXT,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                );
            """)
        )

        # Seed sample data
        c_id = str(uuid.uuid4())
        p_id = str(uuid.uuid4())
        act_id = str(uuid.uuid4())
        lead_id = str(uuid.uuid4())

        conn.execute(
            text("INSERT INTO companies (id, company_name, domain, attributes) VALUES (:id, :name, :domain, :attr)"),
            {"id": c_id, "name": "Acme Corp", "domain": "acme.com", "attr": json.dumps({"source": "manual"})},
        )
        conn.execute(
            text("""
                INSERT INTO persons (
                    id, first_name, last_name, primary_email, linkedin_url,
                    in_linkedin_connections, in_substack_subscriber_export, primary_company_id
                ) VALUES (:id, :fn, :ln, :em, :li, 1, 1, :comp_id)
            """),
            {
                "id": p_id,
                "fn": "Alice",
                "ln": "Smith",
                "em": "alice@acme.com",
                "li": "https://www.linkedin.com/in/alicesmith",
                "comp_id": c_id,
            },
        )
        conn.execute(
            text("""
                INSERT INTO person_company_relationships (id, person_id, company_id, role, is_current)
                VALUES (:id, :p, :c, 'CTO', 1)
            """),
            {"id": str(uuid.uuid4()), "p": p_id, "c": c_id},
        )
        conn.execute(
            text("""
                INSERT INTO persons_linkedins (connection_id, first_name, last_name, profile_url, email_address)
                VALUES ('conn-123', 'Alice', 'Smith', 'https://linkedin.com/in/alicesmith', 'alice@acme.com')
            """)
        )
        conn.execute(
            text("""
                INSERT INTO leads_linkedin (conversation_id, person_id, full_name, message_count, convo_history)
                VALUES ('convo-456', :p, 'Alice Smith', 3, 'Hi Jimmy!')
            """),
            {"p": p_id},
        )
        conn.execute(
            text("""
                INSERT INTO activities_notion_meeting_notes (page_id, title, attendees, summary_or_content)
                VALUES ('page-789', 'Acme Alignment', 'Alice Smith', 'Discussed requirements')
            """)
        )
        conn.execute(
            text("""
                INSERT INTO activities (id, activity_type, source, source_id, person_id, company_id, title, summary_or_content)
                VALUES (:id, 'meeting', 'notion', 'notion-act-1', :p, :c, 'Acme Kickoff', 'Good progress')
            """),
            {"id": act_id, "p": p_id, "c": c_id},
        )
        conn.execute(
            text("""
                INSERT INTO leads (id, person_id, company_id, status, source, intent, signal_strength)
                VALUES (:id, :p, :c, 'reached', 'linkedin', 'consulting', 'strong')
            """),
            {"id": lead_id, "p": p_id, "c": c_id},
        )

    # 2. Setup Target Schema (CDB)
    with tgt_engine.begin() as conn:
        conn.execute(
            text("""
                CREATE TABLE companies (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    domain TEXT UNIQUE,
                    industry TEXT,
                    size_range TEXT,
                    country TEXT,
                    city TEXT,
                    linkedin_url TEXT,
                    avatar_url TEXT,
                    attributes TEXT NOT NULL,
                    deleted_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE persons (
                    id TEXT PRIMARY KEY,
                    first_name TEXT,
                    last_name TEXT,
                    primary_email TEXT UNIQUE,
                    secondary_emails TEXT,
                    primary_phone TEXT,
                    linkedin_url TEXT UNIQUE,
                    twitter_handle TEXT,
                    facebook_id TEXT,
                    whatsapp_phone TEXT,
                    city TEXT,
                    country TEXT,
                    avatar_url TEXT,
                    attributes TEXT NOT NULL,
                    sources TEXT NOT NULL,
                    source_ids TEXT,
                    deleted_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE person_company_relationships (
                    id TEXT PRIMARY KEY,
                    person_id TEXT NOT NULL,
                    company_id TEXT NOT NULL,
                    title TEXT,
                    is_current BOOLEAN NOT NULL DEFAULT 1,
                    started_at DATE,
                    ended_at DATE,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE intake_linkedin_connections (
                    id TEXT PRIMARY KEY,
                    connection_id TEXT UNIQUE NOT NULL,
                    first_name TEXT,
                    last_name TEXT,
                    profile_url TEXT,
                    email_address TEXT,
                    company TEXT,
                    position TEXT,
                    connected_at TIMESTAMP,
                    raw_payload TEXT,
                    status TEXT NOT NULL,
                    resolved_person_id TEXT,
                    ingested_at TIMESTAMP NOT NULL
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE intake_linkedin_messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT UNIQUE NOT NULL,
                    participant_names TEXT,
                    message_count INTEGER NOT NULL DEFAULT 0,
                    raw_content TEXT,
                    raw_payload TEXT,
                    status TEXT NOT NULL,
                    resolved_person_id TEXT,
                    ingested_at TIMESTAMP NOT NULL
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE intake_notion_meeting_notes (
                    id TEXT PRIMARY KEY,
                    page_id TEXT UNIQUE NOT NULL,
                    database_name TEXT,
                    title TEXT,
                    meeting_date TIMESTAMP,
                    attendees TEXT,
                    summary TEXT,
                    to_dos TEXT,
                    url TEXT,
                    raw_payload TEXT,
                    status TEXT NOT NULL,
                    ingested_at TIMESTAMP NOT NULL
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE activities (
                    id TEXT PRIMARY KEY,
                    person_id TEXT,
                    company_id TEXT,
                    type TEXT NOT NULL,
                    source TEXT NOT NULL,
                    source_id TEXT UNIQUE,
                    occurred_at TIMESTAMP NOT NULL,
                    title TEXT,
                    summary TEXT,
                    raw_content TEXT,
                    attributes TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                );
            """)
        )
        conn.execute(
            text("""
                CREATE TABLE leads (
                    id TEXT PRIMARY KEY,
                    person_id TEXT NOT NULL,
                    company_id TEXT,
                    owner_id TEXT,
                    stage TEXT NOT NULL,
                    source TEXT,
                    source_ref_id TEXT,
                    intent TEXT,
                    signal_strength TEXT,
                    notes TEXT,
                    disqualification_reason TEXT,
                    converted_at TIMESTAMP,
                    converted_opportunity_id TEXT,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                );
            """)
        )

    # 3. Run Migrator
    migrator = DataMigrator(source_url=src_url, target_url=tgt_url, dry_run=False)
    migrator.run()

    # 4. Verify Target DB Contents
    with tgt_engine.connect() as conn:
        comp_count = conn.execute(text("SELECT COUNT(*) FROM companies")).scalar()
        assert comp_count == 1

        person_row = conn.execute(text("SELECT * FROM persons")).mappings().one()
        assert person_row["first_name"] == "Alice"
        assert person_row["primary_email"] == "alice@acme.com"
        assert person_row["linkedin_url"] == "linkedin.com/in/alicesmith"
        attrs = json.loads(person_row["attributes"])
        assert attrs["jager_origin_id"] == p_id

        pcr_count = conn.execute(text("SELECT COUNT(*) FROM person_company_relationships")).scalar()
        assert pcr_count >= 1

        intake_conn_count = conn.execute(text("SELECT COUNT(*) FROM intake_linkedin_connections")).scalar()
        assert intake_conn_count == 1

        intake_msg_count = conn.execute(text("SELECT COUNT(*) FROM intake_linkedin_messages")).scalar()
        assert intake_msg_count == 1

        intake_notion_count = conn.execute(text("SELECT COUNT(*) FROM intake_notion_meeting_notes")).scalar()
        assert intake_notion_count == 1

        act_row = conn.execute(text("SELECT * FROM activities")).mappings().one()
        assert act_row["type"] == "meeting"
        assert act_row["source_id"] == "notion-act-1"

        lead_row = conn.execute(text("SELECT * FROM leads")).mappings().one()
        assert lead_row["stage"] == "contacted"  # Mapped from 'reached'
        assert lead_row["source_ref_id"] == lead_id

    # 5. Verify Idempotency (Running twice should skip and produce 0 duplicates)
    migrator2 = DataMigrator(source_url=src_url, target_url=tgt_url, dry_run=False)
    migrator2.run()

    with tgt_engine.connect() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM companies")).scalar() == 1
        assert conn.execute(text("SELECT COUNT(*) FROM persons")).scalar() == 1
        assert conn.execute(text("SELECT COUNT(*) FROM activities")).scalar() == 1
        assert conn.execute(text("SELECT COUNT(*) FROM leads")).scalar() == 1
