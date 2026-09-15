import uuid

import pytest

from cdb.core.security import create_access_token
from cdb.models.company import Company
from cdb.models.person import Person
from cdb.models.signal import DetectedSignal
from cdb.models.user import User
from cdb.services.signals.catalog import ensure_signals_dimension


@pytest.fixture
async def auth_headers(db_session) -> dict[str, str]:
    user = User(
        email=f"tester_{uuid.uuid4().hex[:8]}@example.com",
        hashed_pw="hashed_pw",
        full_name="Tester",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_link_and_unlink_person_on_detected_signal(db_session, client, auth_headers):
    await ensure_signals_dimension(db_session)

    # Create company & persons
    company = Company(id=uuid.uuid4(), name="Enpal", domain="enpal.com")
    person1 = Person(id=uuid.uuid4(), first_name="Daria", last_name="Krasnobaeva")
    person2 = Person(id=uuid.uuid4(), first_name="Antonia", last_name="Szabo")
    db_session.add_all([company, person1, person2])
    await db_session.flush()

    # Create detected signal
    sig = DetectedSignal(
        id=uuid.uuid4(),
        signal_id="hiring_funding_event",
        company_id=company.id,
        person_id=person1.id,
        title="Hiring Expansion: Enpal",
        status="active",
        severity="medium",
        metadata_payload={},
    )
    db_session.add(sig)
    await db_session.commit()

    p2_id = str(person2.id)
    sig_id = str(sig.id)

    # 1. Link Antonia (recruiter) to the signal
    link_resp = await client.post(
        f"/api/v1/signals/detected/{sig_id}/persons",
        json={"person_id": p2_id, "role": "recruiter"},
        headers=auth_headers,
    )
    assert link_resp.status_code == 200
    data = link_resp.json()
    connected_ids = [p["id"] for p in data["connected_persons"]]
    assert p2_id in connected_ids

    # 2. Unlink Antonia from the signal
    unlink_resp = await client.delete(
        f"/api/v1/signals/detected/{sig_id}/persons/{p2_id}",
        headers=auth_headers,
    )
    assert unlink_resp.status_code == 200
    data2 = unlink_resp.json()
    connected_ids2 = [p["id"] for p in data2["connected_persons"]]
    assert p2_id not in connected_ids2
