from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user_or_api_key
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.schemas.signals import (
    SignalEvaluationResult,
)
from cdb.services.signals import (
    detector as detector_service,
)

router = APIRouter()


@router.post(
    "/evaluate",
    response_model=SignalEvaluationResult,
    status_code=status.HTTP_200_OK,
)
async def trigger_signal_evaluation(
    lookback_days: int = Query(
        90,
        ge=1,
        le=730,
        description="Lookback window in days (default: 90 / 3 months; up to 730 / 2 years)",
    ),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> Any:
    """
    Runs the Signal Detection Engine across all 6 initial catalog signals:
    - Dormant strategic accounts
    - Unanswered conversations
    - Expiring contracts
    - Leadership changes
    - Hiring or funding events
    - Competitor signals
    """
    return await detector_service.evaluate_all_signals(db, lookback_days=lookback_days)
