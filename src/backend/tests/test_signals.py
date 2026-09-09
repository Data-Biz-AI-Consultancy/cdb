import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.security import create_access_token
from cdb.models.user import User
from cdb.schemas.signals import (
    DetectionMechanism,
    SignalCategory,
    SignalSeverity,
    SignalTargetEntity,
)
from cdb.services.signals.catalog import (
    INITIAL_SIGNAL_CATALOG,
    get_catalog_response,
    get_signal_by_id,
    get_signals_from_db,
)


@pytest.fixture
async def auth_headers(db_session: AsyncSession) -> dict[str, str]:
    user = User(
        email="signals_auditor@example.com",
        hashed_pw="hashed_pw",
        full_name="Signals Auditor",
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


def test_initial_signal_catalog_completeness():
    """Verify that all 6 required signals are defined with required attributes."""
    expected_ids = {
        "dormant_strategic_account",
        "unanswered_conversation",
        "expiring_contract",
        "leadership_change",
        "hiring_funding_event",
        "competitor_signal",
    }
    actual_ids = {s["id"] for s in INITIAL_SIGNAL_CATALOG}
    assert expected_ids == actual_ids

    valid_categories = {c.value for c in SignalCategory}
    valid_targets = {t.value for t in SignalTargetEntity}
    valid_severities = {s.value for s in SignalSeverity}
    valid_mechanisms = {m.value for m in DetectionMechanism}

    for sig in INITIAL_SIGNAL_CATALOG:
        assert len(sig["name"].strip()) > 0
        assert sig["category"] in valid_categories
        assert sig["target_entity"] in valid_targets
        assert sig["severity"] in valid_severities
        assert sig["detection_mechanism"] in valid_mechanisms
        assert len(sig["business_interpretation"].strip()) >= 50
        assert isinstance(sig["parameters"], dict) and len(sig["parameters"]) > 0
        assert isinstance(sig["recommended_action"], dict)
        assert "playbook" in sig["recommended_action"]
        assert "title" in sig["recommended_action"]
        assert "description" in sig["recommended_action"]


@pytest.mark.asyncio
async def test_get_signals_from_db_and_filtering(db_session: AsyncSession):
    """Test dimension table query and filtering in catalog service."""
    all_signals = await get_signals_from_db(db_session)
    assert len(all_signals) == 6

    # Category filtering
    risk_signals = await get_signals_from_db(db_session, category=SignalCategory.RISK)
    assert len(risk_signals) == 3
    assert {s.id for s in risk_signals} == {
        "dormant_strategic_account",
        "unanswered_conversation",
        "competitor_signal",
    }

    opp_signals = await get_signals_from_db(db_session, category=SignalCategory.OPPORTUNITY)
    assert len(opp_signals) == 1
    assert opp_signals[0].id == "hiring_funding_event"

    hybrid_signals = await get_signals_from_db(db_session, category=SignalCategory.HYBRID)
    assert len(hybrid_signals) == 2
    assert {s.id for s in hybrid_signals} == {
        "expiring_contract",
        "leadership_change",
    }

    # Target entity filtering
    company_signals = await get_signals_from_db(
        db_session, target_entity=SignalTargetEntity.COMPANY
    )
    assert {s.id for s in company_signals} == {
        "dormant_strategic_account",
        "hiring_funding_event",
    }

    person_signals = await get_signals_from_db(db_session, target_entity=SignalTargetEntity.PERSON)
    assert {s.id for s in person_signals} == {
        "unanswered_conversation",
        "leadership_change",
    }

    engagement_signals = await get_signals_from_db(
        db_session, target_entity=SignalTargetEntity.ENGAGEMENT
    )
    assert len(engagement_signals) == 1
    assert engagement_signals[0].id == "expiring_contract"

    opportunity_signals = await get_signals_from_db(
        db_session, target_entity=SignalTargetEntity.OPPORTUNITY
    )
    assert len(opportunity_signals) == 1
    assert opportunity_signals[0].id == "competitor_signal"


@pytest.mark.asyncio
async def test_get_signal_by_id(db_session: AsyncSession):
    """Test retrieving single signal definition by id."""
    signal = await get_signal_by_id(db_session, "dormant_strategic_account")
    assert signal is not None
    assert signal.id == "dormant_strategic_account"
    assert signal.name == "Dormant Strategic Account"
    assert signal.category == "risk"
    assert signal.target_entity == "company"
    assert "Dormancy is the leading indicator" in signal.business_interpretation

    unknown = await get_signal_by_id(db_session, "non_existent_signal")
    assert unknown is None


@pytest.mark.asyncio
async def test_get_catalog_response_with_summary(db_session: AsyncSession):
    """Test building complete catalog response with summary statistics."""
    response = await get_catalog_response(db_session)
    assert len(response.data) == 6
    assert response.summary.total_signals == 6
    assert response.summary.by_category["risk"] == 3
    assert response.summary.by_category["opportunity"] == 1
    assert response.summary.by_category["hybrid"] == 2
    assert response.summary.by_target_entity["company"] == 2
    assert response.summary.by_target_entity["person"] == 2
    assert response.summary.by_target_entity["engagement"] == 1
    assert response.summary.by_target_entity["opportunity"] == 1


@pytest.mark.asyncio
async def test_api_catalog_list_and_filters(client: AsyncClient, auth_headers: dict[str, str]):
    """Test GET /api/v1/signals/catalog endpoint."""
    # List all
    res = await client.get("/api/v1/signals/catalog", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert "data" in body and "summary" in body
    assert len(body["data"]) == 6
    assert body["summary"]["total_signals"] == 6

    # Filter by category
    res_risk = await client.get("/api/v1/signals/catalog?category=risk", headers=auth_headers)
    assert res_risk.status_code == 200
    risk_data = res_risk.json()["data"]
    assert len(risk_data) == 3
    for item in risk_data:
        assert item["category"] == "risk"

    # Filter by target entity
    res_company = await client.get(
        "/api/v1/signals/catalog?target_entity=company", headers=auth_headers
    )
    assert res_company.status_code == 200
    company_data = res_company.json()["data"]
    assert len(company_data) == 2
    for item in company_data:
        assert item["target_entity"] == "company"


@pytest.mark.asyncio
async def test_api_catalog_single_signal(client: AsyncClient, auth_headers: dict[str, str]):
    """Test GET /api/v1/signals/catalog/{signal_id} endpoint."""
    res = await client.get("/api/v1/signals/catalog/unanswered_conversation", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == "unanswered_conversation"
    assert body["name"] == "Unanswered Conversation"
    assert body["category"] == "risk"
    assert body["target_entity"] == "person"
    assert body["severity"] == "critical"
    assert "parameters" in body and "warning_days" in body["parameters"]
    assert "recommended_action" in body and "playbook" in body["recommended_action"]


@pytest.mark.asyncio
async def test_api_catalog_not_found(client: AsyncClient, auth_headers: dict[str, str]):
    """Test 404 response for unknown signal id."""
    res = await client.get("/api/v1/signals/catalog/unknown_signal", headers=auth_headers)
    assert res.status_code == 404
    body = res.json()
    assert "error" in body
    assert body["error"]["code"] == "NOT_FOUND"
    assert "unknown_signal" in body["error"]["message"]
