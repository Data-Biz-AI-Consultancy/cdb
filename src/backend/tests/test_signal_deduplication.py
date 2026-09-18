import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.security import create_access_token
from cdb.models.company import Company
from cdb.models.user import User
from cdb.services.signals.catalog import ensure_signals_dimension
from cdb.services.signals.utils.fingerprint import compute_evidence_fingerprint
from cdb.services.signals.utils.upsert import upsert_detected_signal


@pytest.fixture
async def auth_headers(db_session: AsyncSession) -> dict[str, str]:
    user = User(
        email="dedup_tester@example.com",
        hashed_pw="hashed_pw",
        full_name="Dedup Tester",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_evidence_fingerprint_deterministic():
    ev1 = {
        "type": "temporal_inactivity",
        "summary": "No touchpoints recorded for 75 days",
        "source_entity_id": "123",
        "timestamp": "2026-06-01T00:00:00Z",
    }
    ev2 = {
        "type": "temporal_inactivity",
        "summary": "No touchpoints recorded for 75 days",
        "source_entity_id": "123",
        "timestamp": "2026-06-01T00:00:00Z",
    }
    fp1 = compute_evidence_fingerprint("dormant_strategic_account", target_id="123", evidence=ev1)
    fp2 = compute_evidence_fingerprint("dormant_strategic_account", target_id="123", evidence=ev2)
    assert fp1 == fp2

    ev3 = dict(ev1, timestamp="2026-07-01T00:00:00Z")
    fp3 = compute_evidence_fingerprint("dormant_strategic_account", target_id="123", evidence=ev3)
    assert fp1 != fp3


@pytest.mark.asyncio
async def test_dismissed_signal_suppressed_when_evidence_identical(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    company = Company(name="Acme Corporation", domain="acme.corp")
    db_session.add(company)
    await db_session.flush()

    fp = compute_evidence_fingerprint(
        "dormant_strategic_account", target_id=str(company.id), evidence={"days": 75}
    )

    # Initial detection
    sig, is_new = await upsert_detected_signal(
        db_session,
        signal_id="dormant_strategic_account",
        title="Dormant: Acme Corp",
        severity="high",
        company_id=company.id,
        evidence_fingerprint=fp,
        metadata_payload={"evidence": {"days": 75}},
    )
    await db_session.commit()
    assert is_new is True
    assert sig.status == "active"

    # User dismisses signal
    sig.status = "dismissed"
    sig.resolution_notes = "Currently in touch via WhatsApp"
    await db_session.commit()

    # Re-running detection with the exact same fingerprint
    sig_reval, is_new_reval = await upsert_detected_signal(
        db_session,
        signal_id="dormant_strategic_account",
        title="Dormant: Acme Corp",
        severity="high",
        company_id=company.id,
        evidence_fingerprint=fp,
        metadata_payload={"evidence": {"days": 75}},
    )
    await db_session.commit()

    assert is_new_reval is False
    assert sig_reval.id == sig.id
    # Must remain dismissed (suppressed duplicate alert)
    assert sig_reval.status == "dismissed"
    assert sig_reval.resolution_notes == "Currently in touch via WhatsApp"


@pytest.mark.asyncio
async def test_resolved_signal_reopens_on_meaningful_new_evidence(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    company = Company(name="Beta Logistics", domain="betalog.com")
    db_session.add(company)
    await db_session.flush()

    fp1 = compute_evidence_fingerprint(
        "dormant_strategic_account", target_id=str(company.id), evidence={"days": 60}
    )

    # Initial detection
    sig, is_new = await upsert_detected_signal(
        db_session,
        signal_id="dormant_strategic_account",
        title="Dormant: Beta Logistics",
        severity="high",
        company_id=company.id,
        evidence_fingerprint=fp1,
        metadata_payload={"evidence": {"days": 60}},
    )
    await db_session.commit()
    assert sig.status == "active"

    # User resolves signal
    sig.status = "resolved"
    sig.resolution_notes = "Sent check-in email"
    await db_session.commit()

    # New evidence arrives (e.g. 120 days passed with critical severity)
    fp2 = compute_evidence_fingerprint(
        "dormant_strategic_account",
        target_id=str(company.id),
        evidence={"days": 120, "escalated": True},
    )
    sig_reopened, is_new_2 = await upsert_detected_signal(
        db_session,
        signal_id="dormant_strategic_account",
        title="Dormant: Beta Logistics (120d)",
        severity="critical",
        company_id=company.id,
        evidence_fingerprint=fp2,
        metadata_payload={"evidence": {"days": 120, "escalated": True}},
    )
    await db_session.commit()

    assert is_new_2 is False
    assert sig_reopened.id == sig.id
    # Reopened back to active with incremented counter
    assert sig_reopened.status == "active"
    assert sig_reopened.reopen_count == 1
    assert sig_reopened.last_reopened_at is not None
    assert sig_reopened.evidence_fingerprint == fp2


@pytest.mark.asyncio
async def test_snoozed_signal_suppression_and_auto_wake(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    company = Company(name="Gamma Systems", domain="gammasys.com")
    db_session.add(company)
    await db_session.flush()

    now = datetime.datetime.now(datetime.UTC)
    future_snooze = now + datetime.timedelta(days=7)

    fp = compute_evidence_fingerprint(
        "dormant_strategic_account", target_id=str(company.id), evidence={"days": 65}
    )

    sig, _ = await upsert_detected_signal(
        db_session,
        signal_id="dormant_strategic_account",
        title="Dormant: Gamma Systems",
        severity="high",
        company_id=company.id,
        evidence_fingerprint=fp,
    )
    await db_session.commit()

    # User snoozes signal for 7 days
    sig.status = "snoozed"
    sig.snoozed_until = future_snooze
    await db_session.commit()

    # Evaluating while within snooze window -> remains snoozed
    sig_eval, _ = await upsert_detected_signal(
        db_session,
        signal_id="dormant_strategic_account",
        title="Dormant: Gamma Systems",
        severity="high",
        company_id=company.id,
        evidence_fingerprint=fp,
    )
    await db_session.commit()
    assert sig_eval.status == "snoozed"
    assert sig_eval.snoozed_until == future_snooze

    # Simulate snooze expired
    sig.snoozed_until = now - datetime.timedelta(hours=1)
    await db_session.commit()

    # Evaluating after snooze expiry -> auto-wakes to active
    sig_woke, _ = await upsert_detected_signal(
        db_session,
        signal_id="dormant_strategic_account",
        title="Dormant: Gamma Systems",
        severity="high",
        company_id=company.id,
        evidence_fingerprint=fp,
    )
    await db_session.commit()
    assert sig_woke.status == "active"
    assert sig_woke.snoozed_until is None
    assert sig_woke.reopen_count == 1


@pytest.mark.asyncio
async def test_api_snooze_and_bulk_status(
    client: AsyncClient, db_session: AsyncSession, auth_headers: dict[str, str]
):
    await ensure_signals_dimension(db_session)
    company = Company(name="Delta Dynamics", domain="deltadyn.com")
    db_session.add(company)
    await db_session.flush()

    sig1, _ = await upsert_detected_signal(
        db_session,
        signal_id="dormant_strategic_account",
        title="Dormant: Delta Dynamics",
        severity="high",
        company_id=company.id,
    )
    sig2, _ = await upsert_detected_signal(
        db_session,
        signal_id="unanswered_conversation",
        title="Unanswered: Delta Contact",
        severity="medium",
        company_id=company.id,
    )
    await db_session.commit()

    # 1. Test Single Patch Snooze with snooze_days
    resp = await client.patch(
        f"/api/v1/signals/detected/{sig1.id}",
        json={"status": "snoozed", "snooze_days": 14, "resolution_notes": "Follow up after Q3"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "snoozed"
    assert data["snoozed_until"] is not None
    assert data["resolution_notes"] == "Follow up after Q3"

    # 2. Test Bulk Status Update
    bulk_resp = await client.post(
        "/api/v1/signals/detected/bulk-status",
        json={
            "signal_ids": [str(sig1.id), str(sig2.id)],
            "status": "dismissed",
            "resolution_notes": "Bulk dismissed during team triage",
        },
        headers=auth_headers,
    )
    assert bulk_resp.status_code == 200
    bulk_data = bulk_resp.json()
    assert bulk_data["success"] is True
    assert bulk_data["updated_count"] == 2

    # 3. Test Grouped Endpoint
    grouped_resp = await client.get(
        "/api/v1/signals/detected/grouped",
        params={"company_id": str(company.id)},
        headers=auth_headers,
    )
    assert grouped_resp.status_code == 200
    grouped_data = grouped_resp.json()
    assert grouped_data["total_groups"] >= 1
    assert any(g["company_id"] == str(company.id) for g in grouped_data["data"])
