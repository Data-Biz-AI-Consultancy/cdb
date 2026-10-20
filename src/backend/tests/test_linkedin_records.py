"""Unit coverage for the standalone LinkedIn record parsers."""

import datetime

from cdb.services.connectors.linkedin_records import (
    infer_participant_name,
    parse_changelog_records,
    parse_connection_records,
    parse_message_records,
)


def test_parse_message_records_skips_empty_conversation_and_uses_fallback_participant():
    before = datetime.datetime.now(datetime.UTC)
    records = parse_message_records(
        [
            {"DATE": "2024-01-01", "FROM": "Ignored", "TO": "No ID"},
            {
                "conversation_id": "owner-only",
                "date": "not a date",
                "sender_name": "Avery Operator",
                "recipient_name": "Avery Operator",
                "content": "A message with no other participant",
            },
        ],
        owner_name="Avery Operator",
    )

    assert len(records) == 1
    assert records[0].conversation_id == "owner-only"
    assert records[0].participant_names == "Avery Operator"
    assert records[0].raw_content == "Avery Operator: A message with no other participant"
    assert records[0].last_sent_at.tzinfo == datetime.UTC
    assert records[0].last_sent_at >= before


def test_parse_changelog_records_handles_resource_id_and_missing_timestamp():
    before = datetime.datetime.now(datetime.UTC)
    records = parse_changelog_records(
        [
            {"activity": {}},
            {
                "resourceId": "thread-456",
                "activity": {
                    "content": {"content": {"string": "My name is Morgan Lee"}},
                    "actor": "urn:li:person:someone-else",
                },
            },
        ],
        owner_name="Avery Operator",
    )

    assert len(records) == 1
    assert records[0].conversation_id == "thread-456"
    assert records[0].participant_names == "Morgan Lee"
    assert records[0].raw_content == "Contact: My name is Morgan Lee"
    assert records[0].last_sent_at.tzinfo == datetime.UTC
    assert records[0].last_sent_at >= before


def test_infer_participant_name_supports_greeting_owner_filter_and_signoff():
    assert (
        infer_participant_name("Hi Avery, thanks!", {}, owner_name="Avery Operator")
        == "LinkedIn Member"
    )
    assert (
        infer_participant_name(
            "Hi team, the update is ready.\nBest regards,\nMorgan Lee",
            {"morgan": "Morgan Li"},
            owner_name="LinkedIn account",
        )
        == "Morgan Li"
    )
    assert (
        infer_participant_name("My name is Casey Ng", {}, owner_name="LinkedIn account")
        == "Casey Ng"
    )


def test_parse_connection_records_builds_fallback_ids():
    records = parse_connection_records(
        [
            {"first_name": "Riley", "last_name": "Jones"},
            {"Email Address": "Alex+Work@example.com"},
        ]
    )

    assert [record.connection_id for record in records] == [
        "li_conn_riley_jones_unknown",
        "li_conn_alex_work_example_com_unknown",
    ]
    assert records[0].first_name == "Riley"
    assert records[1].email_address == "Alex+Work@example.com"
