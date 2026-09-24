from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user_or_api_key
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.schemas.signals import (
    SignalMetricsResponse,
)
from cdb.services.signals import (
    compute_signal_success_metrics,
)

router = APIRouter()


@router.get(
    "/metrics",
    response_model=SignalMetricsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_signal_metrics(
    lookback_days: int = Query(
        90,
        ge=1,
        le=730,
        description="Timeframe window in days (default: 90 / 3 months; up to 730 / 2 years)",
    ),
    signal_id: str | None = Query(None, description="Filter metrics by signal ID"),
    category: str | None = Query(
        None, description="Filter metrics by category (opportunity, risk, hybrid)"
    ),
    severity: str | None = Query(None, description="Filter metrics by severity"),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> SignalMetricsResponse:
    """
    Computes and returns comprehensive success, quality, operational latency,
    downstream outcomes, and revenue attribution metrics for detected signals.
    """
    return await compute_signal_success_metrics(
        db,
        lookback_days=lookback_days,
        signal_id=signal_id,
        category=category,
        severity=severity,
    )
