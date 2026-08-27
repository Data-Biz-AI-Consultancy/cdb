
from cdb.services.ingestion.signals import detect_message_metadata


def test_detect_message_metadata_consulting_high_signal():
    transcript = "Hi Jimmy, I'd love to access your service for a data stack audit and snowflake pipeline proposal next week."
    meta = detect_message_metadata(transcript)
    assert meta["opportunity_type"] == "consulting_project"
    assert meta["intent"] == "inbound_service_request"
    assert meta["signal_strength"] == "high"


def test_detect_message_metadata_recruitment():
    transcript = "Hi Jimmy, we are recruiting for a Head of Data permanent role. Would you be open for a role?"
    meta = detect_message_metadata(transcript)
    assert "full_time_job" in meta["opportunity_type"]
    assert meta["intent"] == "recruitment_inbound"
    assert meta["signal_strength"] == "medium"


def test_detect_message_metadata_freelance_collaboration():
    transcript = "Hey, are you open to collaborate on a freelance contract project?"
    meta = detect_message_metadata(transcript)
    assert "freelance_contract" in meta["opportunity_type"]
    assert meta["intent"] == "business_collaboration"
