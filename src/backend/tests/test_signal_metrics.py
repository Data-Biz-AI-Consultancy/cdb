import datetime
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.security import create_access_token
from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.opportunity import Opportunity, OpportunityCompany
from cdb.models.signal import DetectedSignal
from cdb.models.user import User
from cdb.services.signals.catalog import ensure_signals_dimension
from cdb.services.signals.metrics import compute_signal_success_metrics


@pytest.fixture
async def auth_headers(db_session: AsyncSession) -> dict[str, str]:
    user = User(
        email="metrics_tester@example.com",
        hashed_pw="hashed_pw",
        full_name="Metrics Tester",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_compute_signal_success_metrics_empty(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    metrics = await compute_signal_success_metrics(db_session, lookback_days=90)

    assert metrics.quality.total_detected == 0
    assert metrics.quality.action_rate == 0.0
    assert metrics.latency.mean_time_to_action_hours is None
    assert metrics.revenue.influenced_pipeline_total == Decimal("0.00")
    assert len(metrics.by_signal) >= 6
    assert len(metrics.by_category) == 3
    assert len(metrics.by_severity) == 4


@pytest.mark.asyncio
async def test_compute_signal_success_metrics_with_data(db_session: AsyncSession):
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    # 1. Create test company
    company = Company(name="Metrics Acme Corp", domain="metricsacme.com")
    db_session.add(company)
    await db_session.flush()

    # 2. Detected signal actioned 24 hours after detection
    detected_at_1 = now - datetime.timedelta(days=10)
    actioned_at_1 = detected_at_1 + datetime.timedelta(hours=24)

    sig1 = DetectedSignal(
        signal_id="hiring_funding_event",
        company_id=company.id,
        status="actioned",
        severity="medium",
        title="Series A Funding",
        detected_at=detected_at_1,
        actioned_at=actioned_at_1,
        metadata_payload={"evidence": {"excerpt": "Raised $10M Series A"}},
    )
    db_session.add(sig1)

    # 3. Dismissed signal (false positive / irrelevant)
    sig2 = DetectedSignal(
        signal_id="competitor_signal",
        company_id=company.id,
        status="dismissed",
        severity="high",
        title="Competitor Bake-off",
        detected_at=now - datetime.timedelta(days=5),
        metadata_payload={"has_conflict": True},
    )
    db_session.add(sig2)

    # 4. Active uncertain signal
    sig3 = DetectedSignal(
        signal_id="unanswered_conversation",
        company_id=company.id,
        status="active",
        severity="critical",
        title="Unanswered thread",
        detected_at=now - datetime.timedelta(days=2),
        metadata_payload={"is_uncertain": True},
    )
    db_session.add(sig3)

    # 5. Opportunity created within 90 days after sig1 actioned_at
    opp = Opportunity(
        title="AI Data Platform Implementation",
        value=Decimal("50000.00"),
        probability=80,
        currency="USD",
        created_at=actioned_at_1 + datetime.timedelta(days=5),
    )
    db_session.add(opp)
    await db_session.flush()

    opp_comp = OpportunityCompany(opportunity_id=opp.id, company_id=company.id)
    db_session.add(opp_comp)

    # 6. Reactivation activity after sig1 actioned_at
    act = Activity(
        company_id=company.id,
        type="meeting",
        source="notion",
        occurred_at=actioned_at_1 + datetime.timedelta(days=2),
        title="Executive Follow-up",
    )
    db_session.add(act)

    await db_session.commit()

    # Compute metrics
    metrics = await compute_signal_success_metrics(db_session, lookback_days=90)

    assert metrics.quality.total_detected == 3
    assert metrics.quality.total_actioned == 1
    assert metrics.quality.total_dismissed == 1
    assert metrics.quality.total_active == 1
    assert round(metrics.quality.action_rate, 2) == 0.33
    assert round(metrics.quality.dismissal_rate, 2) == 0.33
    assert round(metrics.quality.precision_proxy, 2) == 0.67
    assert round(metrics.quality.needs_verification_rate, 2) == 0.33
    assert round(metrics.quality.conflict_rate, 2) == 0.33

    # Latency: exactly 24.0 hours
    assert metrics.latency.total_actioned_measured == 1
    assert metrics.latency.mean_time_to_action_hours == 24.0
    assert metrics.latency.median_time_to_action_hours == 24.0
    assert metrics.latency.sla_breach_count == 0

    # Outcomes & Revenue
    assert metrics.outcomes.opportunities_created_count == 1
    assert metrics.outcomes.opportunity_conversion_rate == 1.0
    assert metrics.revenue.influenced_pipeline_total == Decimal("50000.00")
    assert metrics.revenue.weighted_influenced_pipeline_total == Decimal("40000.00")
    assert metrics.revenue.value_coverage_rate == 1.0


@pytest.mark.asyncio
async def test_signal_metrics_api_endpoint(
    client: AsyncClient,
    db_session: AsyncSession,
    auth_headers: dict[str, str],
):
    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    company = Company(name="Endpoint Corp", domain="endpointcorp.com")
    db_session.add(company)
    await db_session.flush()

    sig = DetectedSignal(
        signal_id="dormant_strategic_account",
        company_id=company.id,
        status="actioned",
        severity="high",
        title="Dormant Account Alert",
        detected_at=now - datetime.timedelta(days=20),
        actioned_at=now - datetime.timedelta(days=19),
        metadata_payload={},
    )
    db_session.add(sig)
    await db_session.commit()

    resp = await client.get("/api/v1/signals/metrics?lookback_days=90", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "quality" in data
    assert "latency" in data
    assert "outcomes" in data
    assert "revenue" in data
    assert "by_signal" in data
    assert "by_category" in data
    assert "by_severity" in data

    assert data["quality"]["total_detected"] >= 1
    assert data["quality"]["total_actioned"] >= 1
    assert data["latency"]["mean_time_to_action_hours"] == 24.0


@pytest.mark.asyncio
async def test_compute_signal_metrics_reactivations_renewals_and_sla_breach(
    db_session: AsyncSession,
):
    from cdb.models.engagement import Engagement

    await ensure_signals_dimension(db_session)
    now = datetime.datetime.now(datetime.UTC)

    company = Company(name="Renewal Corp", domain="renewalcorp.com")
    db_session.add(company)
    await db_session.flush()

    # 1. Unanswered conversation with SLA breach (>72h)
    det_at_1 = now - datetime.timedelta(days=15)
    act_at_1 = det_at_1 + datetime.timedelta(hours=80)  # > 72h SLA breach

    sig1 = DetectedSignal(
        signal_id="unanswered_conversation",
        company_id=company.id,
        status="actioned",
        severity="critical",
        title="Unanswered thread",
        detected_at=det_at_1,
        actioned_at=act_at_1,
        metadata_payload={},
    )
    db_session.add(sig1)

    # 2. Risk signal followed by reactivation activity
    act = Activity(
        company_id=company.id,
        type="email",
        source="manual",
        occurred_at=act_at_1 + datetime.timedelta(days=2),
        title="Re-engagement email",
    )
    db_session.add(act)

    # 3. Expiring contract renewed within 90 days
    det_at_2 = now - datetime.timedelta(days=12)
    act_at_2 = det_at_2 + datetime.timedelta(hours=12)
    sig2 = DetectedSignal(
        signal_id="expiring_contract",
        company_id=company.id,
        status="actioned",
        severity="high",
        title="Expiring retainer",
        detected_at=det_at_2,
        actioned_at=act_at_2,
        metadata_payload={},
    )
    db_session.add(sig2)

    eng = Engagement(
        company_id=company.id,
        title="Retainer Extension 2026",
        status="active",
        contract_status="signed",
        total_value=Decimal("120000.00"),
        signed_at=act_at_2.date(),
    )
    db_session.add(eng)

    await db_session.commit()

    # Compute metrics
    metrics = await compute_signal_success_metrics(
        db_session,
        lookback_days=90,
    )

    assert metrics.quality.total_detected == 2
    assert metrics.quality.total_actioned == 2
    assert metrics.latency.sla_breach_count == 1
    assert metrics.outcomes.account_reactivations_count >= 1
    assert metrics.outcomes.contracts_renewed_count >= 1
    assert metrics.revenue.protected_revenue_total == Decimal("120000.00")
