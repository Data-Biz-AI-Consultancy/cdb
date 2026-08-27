from typing import Any


def detect_message_metadata(convo_transcript: str | None) -> dict[str, Any]:
    """
    Analyzes conversation transcript or message text to extract opportunity_type,
    intent, and signal_strength for automated lead creation & enrichment.
    """
    text_lower = convo_transcript.lower() if convo_transcript else ""

    # 1. Opportunity Type Detection
    opp_types = []
    if any(
        k in text_lower
        for k in [
            "consulting",
            "advisory",
            "fractional",
            "audit",
            "data stack",
            "snowflake",
            "data engineering",
            "pipeline",
        ]
    ):
        opp_types.append("consulting_project")
    if any(k in text_lower for k in ["freelance", "contract", "interim", "subcontract"]):
        opp_types.append("freelance_contract")
    if any(
        k in text_lower
        for k in [
            "full time",
            "full-time",
            "permanent",
            "head of",
            "director",
            "lead",
            "hiring",
            "recruit",
            "talent partner",
        ]
    ):
        opp_types.append("full_time_job")

    opportunity_type = "/".join(opp_types) if opp_types else "general_inquiry"

    # 2. Intent Detection
    if any(
        k in text_lower
        for k in [
            "access your service",
            "hire you for",
            "consulting rate",
            "hourly rate",
            "data stack audit",
            "build our data",
            "project proposal",
            "freelance proposal",
            "advice regarding data",
            "data and analytics",
            "engineering firm",
            "snowflake",
            "pipeline",
            "audit",
            "need some advice",
            "service inquiry",
            "consulting project",
            "exploring ai",
            "databizaitech",
            "my new business",
            "consultancy page",
            "your site",
            "security & compliance",
            "gdpr",
        ]
    ):
        intent = "inbound_service_request"
    elif any(
        k in text_lower
        for k in [
            "recruiting",
            "recruiter",
            "talent acquisition",
            "talent partner",
            "open for a role",
            "job opportunity",
            "hiring",
        ]
    ):
        intent = "recruitment_inbound"
    elif any(
        k in text_lower
        for k in [
            "consulting",
            "advisory",
            "project",
            "freelance",
            "contract",
            "work together",
            "call",
            "meeting",
        ]
    ):
        intent = "business_collaboration"
    else:
        intent = "networking_inquiry"

    # 3. Signal Strength Detection
    if any(
        k in text_lower
        for k in [
            "access your service",
            "pricing",
            "rate",
            "quote",
            "proposal",
            "call next week",
            "call this week",
            "phone number",
            "calendar invite",
            "google meet",
        ]
    ):
        signal_strength = "high"
    elif any(
        k in text_lower
        for k in [
            "opportunity",
            "hiring",
            "role",
            "project",
            "freelance",
            "contract",
            "advice",
        ]
    ):
        signal_strength = "medium"
    else:
        signal_strength = "low"

    return {
        "intent": intent,
        "signal_strength": signal_strength,
        "opportunity_type": opportunity_type,
    }
