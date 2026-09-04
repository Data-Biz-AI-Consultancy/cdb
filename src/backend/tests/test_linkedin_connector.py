import datetime
from unittest.mock import AsyncMock, patch
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.intake import IntakeLinkedInConnection, IntakeLinkedInMessage
from cdb.models.person import Person
from cdb.services.connectors.linkedin import (
    LinkedInConnectorService,
    parse_flexible_datetime,
)


def test_parse_flexible_datetime():
    dt1 = parse_flexible_datetime("2024-05-14T15:30:00Z")
    assert dt1 == datetime.datetime(2024, 5, 14, 15, 30, tzinfo=datetime.timezone.utc)

    dt2 = parse_flexible_datetime("2023-11-20 08:45:00 UTC")
    assert dt2 == datetime.datetime(2023, 11, 20, 8, 45, tzinfo=datetime.timezone.utc)

    dt3 = parse_flexible_datetime("2022-01-15")
    assert dt3.year == 2022 and dt3.month == 1 and dt3.day == 15

    assert parse_flexible_datetime("") is None
    assert parse_flexible_datetime(None) is None


def test_parse_messages_grouping_and_timestamps():
    service = LinkedInConnectorService()

    raw_records = [
        {
            "CONVERSATION ID": "convo_123",
            "DATE": "2023-01-10 10:00:00 UTC",
            "FROM": "Alice Cooper",
            "TO": "Jimmy Pang",
            "CONTENT": "Hi Jimmy, are you free to discuss a project?",
            "SENDER PROFILE URL": "https://linkedin.com/in/alice-cooper",
        },
        {
            "CONVERSATION ID": "convo_123",
            "DATE": "2023-01-10 11:30:00 UTC",
            "FROM": "Jimmy Pang",
            "TO": "Alice Cooper",
            "CONTENT": "Hey Alice, yes absolutely!",
            "SENDER PROFILE URL": "https://linkedin.com/in/jimmypang",
        },
        {
            "CONVERSATION ID": "convo_123",
            "DATE": "2023-01-12 14:00:00 UTC",
            "FROM": "Alice Cooper",
            "TO": "Jimmy Pang",
            "CONTENT": "Great, let us schedule a sync next week.",
            "SENDER PROFILE URL": "https://linkedin.com/in/alice-cooper",
        },
        {
            "CONVERSATION ID": "convo_456",
            "DATE": "2023-05-01 09:00:00 UTC",
            "FROM": "Bob Dylan",
            "TO": "Jimmy Pang",
            "CONTENT": "Hello Jimmy, love your content.",
            "SENDER PROFILE URL": "https://linkedin.com/in/bob-dylan",
        },
    ]

    records = service.parse_messages(raw_records, owner_name="Jimmy Pang")

    assert len(records) == 2
    r_map = {r.conversation_id: r for r in records}

    c123 = r_map["convo_123"]
    assert c123.message_count == 3
    assert c123.participant_names == "Alice Cooper"
    assert "Alice Cooper: Hi Jimmy" in c123.raw_content
    assert "Alice Cooper: Great, let us schedule" in c123.raw_content
    # Timestamp fidelity: latest message date
    assert c123.last_sent_at == datetime.datetime(2023, 1, 12, 14, 0, tzinfo=datetime.timezone.utc)
    assert c123.first_sent_at == datetime.datetime(2023, 1, 10, 10, 0, tzinfo=datetime.timezone.utc)

    c456 = r_map["convo_456"]
    assert c456.message_count == 1
    assert c456.participant_names == "Bob Dylan"
    assert c456.last_sent_at == datetime.datetime(2023, 5, 1, 9, 0, tzinfo=datetime.timezone.utc)


def test_parse_connections():
    service = LinkedInConnectorService()
    raw_records = [
        {
            "First Name": "Charlie",
            "Last Name": "Brown",
            "Company": "Acme Corp",
            "Position": "VP of Engineering",
            "Email Address": "charlie@acme.com",
            "URL": "https://www.linkedin.com/in/charliebrown",
            "Connected On": "2022-08-15 12:00:00 UTC",
        }
    ]
    conns = service.parse_connections(raw_records)
    assert len(conns) == 1
    c = conns[0]
    assert c.first_name == "Charlie"
    assert c.last_name == "Brown"
    assert c.company == "Acme Corp"
    assert c.position == "VP of Engineering"
    assert c.email_address == "charlie@acme.com"
    assert c.profile_url == "https://www.linkedin.com/in/charliebrown"
    assert c.connected_at == datetime.datetime(2022, 8, 15, 12, 0, tzinfo=datetime.timezone.utc)


@pytest.mark.asyncio
async def test_direct_sync_preserves_activity_timestamp(db_session: AsyncSession):
    """
    Verifies that LinkedIn messages directly synced through the connector
    properly receive their authentic historical timestamp in Activity.occurred_at.
    """
    # 1. Pre-create Person to resolve participant
    person = Person(
        first_name="Diana",
        last_name="Prince",
        primary_email="diana@themyscira.com",
        linkedin_url="https://linkedin.com/in/dianaprince",
        sources=["linkedin"],
    )
    db_session.add(person)
    await db_session.flush()

    raw_messages = [
        {
            "CONVERSATION ID": "convo_diana_999",
            "DATE": "2023-03-15 08:30:00 UTC",
            "FROM": "Diana Prince",
            "TO": "Jimmy Pang",
            "CONTENT": "We have an urgent strategic consulting need.",
            "SENDER PROFILE URL": "https://linkedin.com/in/dianaprince",
        }
    ]

    service = LinkedInConnectorService(access_token="mock-token")

    with patch.object(service, "fetch_snapshot_domain", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.side_effect = lambda domain, client=None: (
            raw_messages if domain == "MESSAGES" else []
        )

        res = await service.sync(db_session, sync_messages=True, sync_connections=False)
        assert res["conversations_ingested"] == 1

    # 2. Check Intake record
    intake = (
        await db_session.execute(
            select(IntakeLinkedInMessage).where(
                IntakeLinkedInMessage.conversation_id == "convo_diana_999"
            )
        )
    ).scalar_one_or_none()

    assert intake is not None
    expected_dt = datetime.datetime(2023, 3, 15, 8, 30, tzinfo=datetime.timezone.utc)
    # Account for SQLite naive datetime storage
    intake_dt = (
        intake.last_sent_at.replace(tzinfo=datetime.timezone.utc)
        if intake.last_sent_at and intake.last_sent_at.tzinfo is None
        else intake.last_sent_at
    )
    assert intake_dt == expected_dt

    # 3. Check Activity record
    act = (
        await db_session.execute(
            select(Activity).where(Activity.source_id == "li_msg:convo_diana_999")
        )
    ).scalar_one_or_none()

    assert act is not None
    assert act.person_id == person.id
    # Crucial check: Activity.occurred_at MUST be 2023-03-15, NOT now()
    act_dt = (
        act.occurred_at.replace(tzinfo=datetime.timezone.utc)
        if act.occurred_at and act.occurred_at.tzinfo is None
        else act.occurred_at
    )
    assert act_dt == expected_dt


@pytest.mark.asyncio
async def test_connectors_api_endpoints(client: AsyncClient):
    headers = {"X-API-Key": "development-api-key"}
    # Status endpoint
    resp = await client.get("/api/v1/connectors/linkedin/status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["connector"] == "linkedin"
    assert "configured" in data

    # Sync endpoint with mocked service
    with patch("cdb.api.v1.connectors.LinkedInConnectorService.sync", new_callable=AsyncMock) as mock_sync:
        mock_sync.return_value = {
            "status": "success",
            "messages_fetched": 10,
            "conversations_ingested": 2,
            "connections_fetched": 5,
            "connections_ingested": 5,
        }

        resp = await client.post(
            "/api/v1/connectors/linkedin/sync?async_run=false",
            headers=headers,
        )
        assert resp.status_code == 200
        sync_data = resp.json()
        assert sync_data["status"] == "success"
        assert sync_data["conversations_ingested"] == 2
