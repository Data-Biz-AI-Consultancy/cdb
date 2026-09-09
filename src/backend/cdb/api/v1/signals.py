import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user_or_api_key
from cdb.core.database import get_db
from cdb.core.errors import NotFoundError
from cdb.models.user import User
from cdb.schemas.common import PaginatedResponse, PaginationMetadata
from cdb.schemas.signals import (
    DetectedSignalResponse,
    DetectedSignalStatsResponse,
    DetectedSignalStatus,
    DetectedSignalUpdate,
    SignalCatalogResponse,
    SignalCategory,
    SignalDefinition,
    SignalEvaluationResult,
    SignalSeverity,
    SignalTargetEntity,
)
from cdb.services.signals import (
    catalog as signal_catalog_service,
)
from cdb.services.signals import (
    detected as detected_signal_service,
)
from cdb.services.signals import (
    detector as detector_service,
)

router = APIRouter(prefix="/signals", tags=["Signals"])


# ─────────────────────────────────────────────────────────────────────────────
# 1. Signal Catalog Endpoints (Dimension)
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/catalog",
    response_model=SignalCatalogResponse,
    status_code=status.HTTP_200_OK,
)
async def get_signal_catalog(
    category: SignalCategory | None = Query(
        None, description="Filter by signal category (opportunity, risk, hybrid)"
    ),
    target_entity: SignalTargetEntity | None = Query(
        None, description="Filter by target entity (company, person, opportunity, engagement)"
    ),
    severity: SignalSeverity | None = Query(
        None, description="Filter by severity level (critical, high, medium, low)"
    ),
    active_only: bool = Query(True, description="Filter to active signals only"),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> SignalCatalogResponse:
    """
    Returns the Opportunity & Risk Signal Catalog stored in the PostgreSQL dimension table.
    Supports filtering by category, target entity, and severity, and includes aggregate summary statistics.
    """
    return await signal_catalog_service.get_catalog_response(
        db,
        category=category,
        target_entity=target_entity,
        severity=severity,
        active_only=active_only,
    )


@router.get(
    "/catalog/{signal_id}",
    response_model=SignalDefinition,
    status_code=status.HTTP_200_OK,
)
async def get_signal_definition(
    signal_id: str,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> SignalDefinition:
    """
    Retrieves the complete definition, business interpretation, trigger parameters,
    and recommended action playbook for a specific signal from the PostgreSQL dimension table.
    """
    signal = await signal_catalog_service.get_signal_by_id(db, signal_id)
    if not signal:
        raise NotFoundError(
            message=f"Signal with id '{signal_id}' not found in catalog",
            details={"signal_id": signal_id},
        )
    return SignalDefinition.model_validate(signal)


# ─────────────────────────────────────────────────────────────────────────────
# 2. Automated Detection & Evaluation
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/evaluate",
    response_model=SignalEvaluationResult,
    status_code=status.HTTP_200_OK,
)
async def trigger_signal_evaluation(
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
    return await detector_service.evaluate_all_signals(db)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Detected Signals (Fact / Bridge Instances)
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/detected/stats",
    response_model=DetectedSignalStatsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_detected_stats(
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> DetectedSignalStatsResponse:
    """
    Returns real-time aggregate count metrics of active and historical detected signals.
    """
    return await detected_signal_service.get_detected_signal_stats(db)


@router.get(
    "/detected",
    response_model=PaginatedResponse[DetectedSignalResponse],
    status_code=status.HTTP_200_OK,
)
async def list_detected_signals(
    signal_id: str | None = Query(None, description="Filter by signal slug ID"),
    category: str | None = Query(
        None, description="Filter by category (opportunity, risk, hybrid)"
    ),
    status_filter: DetectedSignalStatus | None = Query(
        None,
        alias="status",
        description="Filter by status (active, acknowledged, actioned, dismissed)",
    ),
    severity: SignalSeverity | None = Query(None, description="Filter by severity level"),
    company_id: uuid.UUID | None = Query(None, description="Filter by company ID"),
    person_id: uuid.UUID | None = Query(None, description="Filter by person ID"),
    opportunity_id: uuid.UUID | None = Query(None, description="Filter by opportunity ID"),
    engagement_id: uuid.UUID | None = Query(None, description="Filter by engagement ID"),
    is_uncertain: bool | None = Query(
        None, description="Filter by uncertain / needs verification status"
    ),
    has_conflict: bool | None = Query(None, description="Filter by multi-signal conflict status"),
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> PaginatedResponse[DetectedSignalResponse]:
    """
    Lists detected signals with multi-dimensional filtering and pagination.
    """
    offset = (page - 1) * page_size
    items, total = await detected_signal_service.list_detected_signals(
        db,
        signal_id=signal_id,
        category=category,
        status=status_filter,
        severity=severity,
        company_id=company_id,
        person_id=person_id,
        opportunity_id=opportunity_id,
        engagement_id=engagement_id,
        is_uncertain=is_uncertain,
        has_conflict=has_conflict,
        limit=page_size,
        offset=offset,
    )

    has_more = (offset + len(items)) < total
    return PaginatedResponse(
        data=items,
        pagination=PaginationMetadata(
            page=page,
            page_size=page_size,
            total=total,
            has_more=has_more,
        ),
    )


@router.patch(
    "/detected/{signal_instance_id}",
    response_model=DetectedSignalResponse,
    status_code=status.HTTP_200_OK,
)
async def update_detected_signal_status(
    signal_instance_id: uuid.UUID,
    payload: DetectedSignalUpdate,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> DetectedSignalResponse:
    """
    Updates the status ('acknowledged', 'actioned', 'dismissed', 'resolved')
    and optional resolution notes of an active detected signal.
    """
    updated = await detected_signal_service.update_detected_signal(
        db, signal_instance_id, payload, user=auth_user
    )
    if not updated:
        raise NotFoundError(
            message=f"Detected signal with id '{signal_instance_id}' not found",
            details={"id": str(signal_instance_id)},
        )
    return updated
