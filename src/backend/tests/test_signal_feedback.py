from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.security import create_access_token
from cdb.models.company import Company
from cdb.models.signal import DetectedSignal
from cdb.models.user import User
from cdb.schemas.signals import (
    FeedbackInvestigationStatus,
    SignalFeedbackCreate,
    SignalFeedbackUpdate,
)
from cdb.services.signals.catalog import get_signals_from_db
from cdb.services.signals.feedback.service import (
    create_signal_feedback,
    get_feedback_metrics_summary,
    list_signal_feedback,
    update_feedback_investigation,
)


@pytest.fixture
async def test_user_and_headers(db_session: AsyncSession):
    user = User(
        email=f"feedback_analyst_{uuid4().hex[:6]}@example.com",
        hashed_pw="hashed_pw",
        full_name="Feedback Analyst",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return user, {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def sample_detected_signal(db_session: AsyncSession):
    await get_signals_from_db(db_session)

    company = Company(
        id=uuid4(),
        name=f"Quality Test Corp {uuid4().hex[:4]}",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(company)
    await db_session.flush()

    signal = DetectedSignal(
        id=uuid4(),
        signal_id="dormant_strategic_account",
        company_id=company.id,
        title="Dormant Account Alert",
        summary="No communication in 90 days",
        status="active",
        severity="high",
        score=Decimal("75.0"),
        metadata_payload={"confidence_score": 0.70},
        detected_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(signal)
    await db_session.commit()
    await db_session.refresh(signal)
    return signal


@pytest.mark.asyncio
async def test_create_feedback_service_and_auto_dismiss(
    db_session: AsyncSession, sample_detected_signal: DetectedSignal, test_user_and_headers
):
    user, _ = test_user_and_headers
    payload = SignalFeedbackCreate(
        feedback_reason="stale_outdated",
        feedback_notes="Account was engaged via phone last week",
        is_false_positive=True,
        dismiss_signal=True,
    )

    feedback = await create_signal_feedback(
        db=db_session,
        signal_id=sample_detected_signal.id,
        payload=payload,
        user=user,
    )

    assert feedback is not None
    assert feedback.detected_signal_id == sample_detected_signal.id
    assert feedback.feedback_reason == "stale_outdated"
    assert feedback.is_false_positive is True
    assert feedback.status == "pending"

    # Verify signal was auto-dismissed
    await db_session.refresh(sample_detected_signal)
    assert sample_detected_signal.status == "dismissed"
    assert (
        "[stale_outdated]" in sample_detected_signal.resolution_notes
        or "False Positive reported" in sample_detected_signal.resolution_notes
    )


@pytest.mark.asyncio
async def test_list_and_update_feedback_investigation(
    db_session: AsyncSession, sample_detected_signal: DetectedSignal, test_user_and_headers
):
    user, _ = test_user_and_headers
    payload = SignalFeedbackCreate(
        feedback_reason="wrong_entity_attribution",
        feedback_notes="Signal matched sibling subsidiary",
        is_false_positive=True,
    )

    feedback = await create_signal_feedback(
        db=db_session,
        signal_id=sample_detected_signal.id,
        payload=payload,
        user=user,
    )
    assert feedback is not None

    # List feedback
    items, total = await list_signal_feedback(
        db=db_session,
        signal_id=sample_detected_signal.id,
    )
    assert total >= 1
    assert any(item.id == feedback.id for item in items)

    # Update investigation status
    update_payload = SignalFeedbackUpdate(
        status=FeedbackInvestigationStatus.INVESTIGATED,
        investigation_notes="Confirmed cross-entity entity resolution mismatch. Detector rule adjusted.",
    )
    updated = await update_feedback_investigation(
        db=db_session,
        feedback_id=feedback.id,
        payload=update_payload,
        user=user,
    )
    assert updated is not None
    assert updated.status == FeedbackInvestigationStatus.INVESTIGATED.value
    assert "Detector rule adjusted" in updated.investigation_notes


@pytest.mark.asyncio
async def test_feedback_metrics_summary(
    db_session: AsyncSession, sample_detected_signal: DetectedSignal, test_user_and_headers
):
    user, _ = test_user_and_headers
    # Add feedback records
    await create_signal_feedback(
        db=db_session,
        signal_id=sample_detected_signal.id,
        payload=SignalFeedbackCreate(feedback_reason="incorrect_intent", is_false_positive=True),
        user=user,
    )
    await create_signal_feedback(
        db=db_session,
        signal_id=sample_detected_signal.id,
        payload=SignalFeedbackCreate(feedback_reason="stale_outdated", is_false_positive=True),
        user=user,
    )

    metrics = await get_feedback_metrics_summary(db=db_session, lookback_days=90)
    assert metrics["total_false_positives"] >= 2
    assert "incorrect_intent" in metrics["by_reason"]
    assert "stale_outdated" in metrics["by_reason"]


@pytest.mark.asyncio
async def test_feedback_api_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_detected_signal: DetectedSignal,
    test_user_and_headers,
):
    user, headers = test_user_and_headers

    # POST feedback endpoint
    post_res = await client.post(
        f"/api/v1/signals/detected/{sample_detected_signal.id}/feedback",
        json={
            "feedback_reason": "unreliable_source",
            "feedback_notes": "Scraped article was duplicate syndicated press",
            "is_false_positive": True,
            "dismiss_signal": True,
        },
        headers=headers,
    )
    assert post_res.status_code == 201
    fb_data = post_res.json()
    assert fb_data["feedback_reason"] == "unreliable_source"
    assert fb_data["detected_signal_id"] == str(sample_detected_signal.id)

    # GET feedback list endpoint
    get_res = await client.get("/api/v1/signals/feedback", headers=headers)
    assert get_res.status_code == 200
    list_data = get_res.json()
    assert list_data["pagination"]["total"] >= 1
    assert any(i["id"] == fb_data["id"] for i in list_data["data"])

    # PATCH feedback investigation endpoint
    patch_res = await client.patch(
        f"/api/v1/signals/feedback/{fb_data['id']}",
        json={
            "status": "investigated",
            "investigation_notes": "Reviewing data pipeline parser rules",
        },
        headers=headers,
    )
    assert patch_res.status_code == 200
    patched_data = patch_res.json()
    assert patched_data["status"] == "investigated"
