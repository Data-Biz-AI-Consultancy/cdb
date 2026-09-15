import uuid

import pytest

from cdb.models.company import Company
from cdb.models.person import Person
from cdb.services.ingestion.notion_resolver import NotionAttendeeIndex


@pytest.mark.asyncio
async def test_notion_entity_detector_with_company_scoped_contacts():
    # Setup company
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Enpal", domain="enpal.com")

    # Host
    host_id = uuid.uuid4()
    host_person = Person(
        id=host_id,
        first_name="Jimmy",
        last_name="Pang",
        primary_email="jimmy@databiz.ai",
        attributes={"is_internal": True},
    )

    # Interviewer at Enpal
    interviewer_id = uuid.uuid4()
    interviewer = Person(
        id=interviewer_id,
        first_name="Daria",
        last_name="Krasnobaeva",
        attributes={"segment": "hiring_decision_makers"},
    )

    # Recruiter at Enpal
    recruiter_id = uuid.uuid4()
    recruiter = Person(
        id=recruiter_id,
        first_name="Antonia",
        last_name="Szabo",
        attributes={"segment": "recruiters_and_talent"},
    )

    persons = [host_person, interviewer, recruiter]
    companies = [company]
    person_companies = {
        interviewer_id: ["enpal"],
        recruiter_id: ["enpal"],
    }
    person_company_ids = {
        interviewer_id: company_id,
        recruiter_id: company_id,
    }

    index = NotionAttendeeIndex(
        persons=persons,
        companies=companies,
        person_companies=person_companies,
        person_company_ids=person_company_ids,
    )

    # Test resolution of meeting note
    title = "Enpal | Termin für Dein Interview | Data Engineering Lead"
    content = """
    * Daria introduced the role as a startup inside a startup at Enpal: small, young, motivated, and still missing a dedicated team lead.
    * She described the current state as flat and decentralized.
    * She confirmed the hiring manager is Marcus, the CTO, and said she would share feedback with Antonia afterward.

    Transcription:
    Hello. Nice to meet you.
    thank you Jimmy for taking your time and then uh yeah have a nice day survive the heat.
    """

    res = index.detect_meeting_entities(
        title=title,
        attendees="",
        url="https://notion.so/enpal-interview",
        content=content,
    )

    # 1. Company resolved to Enpal
    assert res.company_id == company_id

    # 2. Host Jimmy Pang is NOT primary counterparty
    assert res.primary_person_id != host_id

    # 3. Primary counterparty is Daria (the interviewer)
    assert res.primary_person_id == interviewer_id

    # 4. Extracted entities include Daria and Antonia with proper roles
    entity_roles = {e.person_id: e.role for e in res.entities if e.person_id}
    assert entity_roles.get(interviewer_id) == "interviewer"
    assert entity_roles.get(recruiter_id) == "recruiter"
    assert entity_roles.get(host_id) == "host"

    # 5. Suggested persons contain non-internal candidates
    suggested_ids = [s["person_id"] for s in res.suggested_persons]
    assert str(interviewer_id) in suggested_ids
    assert str(recruiter_id) in suggested_ids
    assert str(host_id) not in suggested_ids
