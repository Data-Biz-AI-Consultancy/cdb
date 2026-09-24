import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user_or_api_key
from cdb.core.database import get_db
from cdb.core.errors import NotFoundError
from cdb.models.user import User
from cdb.schemas.common import PaginatedResponse, PaginationMetadata
from cdb.schemas.signals import (
    BulkSignalStatusUpdateRequest,
    BulkSignalStatusUpdateResponse,
    DetectedSignalResponse,
    DetectedSignalStatsResponse,
    DetectedSignalStatus,
    DetectedSignalUpdate,
    GroupedDetectedSignalsResponse,
    SignalPersonLinkRequest,
    SignalSeverity,
)
from cdb.services.signals import (
    detected as detected_signal_service,
)

router = APIRouter()


@router.get(
    "/detected/stats",
    response_model=DetectedSignalStatsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_detected_stats(
    lookback_days: int | None = Query(
        None,
        ge=1,
        le=730,
        description="Filter metrics to signals within lookback window in days",
    ),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> DetectedSignalStatsResponse:
    """
    Returns real-time aggregate count metrics of active and historical detected signals.
    """
    return await detected_signal_service.get_detected_signal_stats(db, lookback_days=lookback_days)


@router.get(
    "/detected/grouped",
    response_model=GroupedDetectedSignalsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_grouped_detected_signals(
    signal_id: str | None = Query(None, description="Filter by signal slug ID"),
    category: str | None = Query(
        None, description="Filter by category (opportunity, risk, hybrid)"
    ),
    status_filter: DetectedSignalStatus | None = Query(
        None,
        alias="status",
        description="Filter by status (active, acknowledged, actioned, snoozed, dismissed, resolved)",
    ),
    severity: SignalSeverity | None = Query(None, description="Filter by severity level"),
    company_id: uuid.UUID | None = Query(None, description="Filter by company ID"),
    priority_tier: str | None = Query(
        None, description="Filter by priority tier (P0, P1, P2, P3, P4)"
    ),
    sort_by: str = Query(
        "priority",
        description="Sort by ordering (priority, newest, oldest, severity, confidence_desc, confidence_asc)",
    ),
    lookback_days: int | None = Query(
        None,
        ge=1,
        le=730,
        description="Filter signals detected within lookback window in days",
    ),
    limit: int = Query(100, ge=1, le=500, description="Max signals to evaluate"),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> GroupedDetectedSignalsResponse:
    """
    Returns detected signals grouped by Account / Company for clustered organization triage.
    """
    return await detected_signal_service.list_grouped_detected_signals(
        db,
        signal_id=signal_id,
        category=category,
        status=status_filter,
        severity=severity,
        company_id=company_id,
        priority_tier=priority_tier,
        sort_by=sort_by,
        lookback_days=lookback_days,
        limit=limit,
    )


@router.post(
    "/detected/bulk-status",
    response_model=BulkSignalStatusUpdateResponse,
    status_code=status.HTTP_200_OK,
)
async def bulk_update_signal_status(
    payload: BulkSignalStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> BulkSignalStatusUpdateResponse:
    """
    Bulk updates the status of multiple detected signals simultaneously (dismiss, snooze, resolve, action).
    """
    return await detected_signal_service.bulk_update_detected_signals(db, payload, user=auth_user)


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
        description="Filter by status (active, acknowledged, actioned, snoozed, dismissed, resolved)",
    ),
    severity: SignalSeverity | None = Query(None, description="Filter by severity level"),
    company_id: uuid.UUID | None = Query(None, description="Filter by company ID"),
    person_id: uuid.UUID | None = Query(None, description="Filter by person ID"),
    opportunity_id: uuid.UUID | None = Query(None, description="Filter by opportunity ID"),
    engagement_id: uuid.UUID | None = Query(None, description="Filter by engagement ID"),
    owner_id: uuid.UUID | None = Query(None, description="Filter by assigned owner user ID"),
    unassigned: bool | None = Query(None, description="Filter to unassigned signals only"),
    is_escalated: bool | None = Query(None, description="Filter by escalation status"),
    is_uncertain: bool | None = Query(
        None, description="Filter by uncertain / needs verification status"
    ),
    has_quality_warning: bool | None = Query(
        None, description="Filter by data quality warning status"
    ),
    source_reliability: str | None = Query(
        None, description="Filter by source reliability (high, medium, low, restricted)"
    ),
    has_conflict: bool | None = Query(None, description="Filter by multi-signal conflict status"),
    priority_tier: str | None = Query(
        None, description="Filter by priority tier (P0, P1, P2, P3, P4)"
    ),
    effective_polarity: str | None = Query(
        None, description="Filter by effective polarity (opportunity, risk)"
    ),
    sort_by: str = Query(
        "priority",
        description="Sort ordering (priority, newest, oldest, severity, confidence_desc, confidence_asc)",
    ),
    lookback_days: int | None = Query(
        None,
        ge=1,
        le=730,
        description="Filter signals detected within lookback window in days",
    ),
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> PaginatedResponse[DetectedSignalResponse]:
    """
    Lists detected signals with multi-dimensional filtering, priority sorting, and pagination.
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
        owner_id=owner_id,
        unassigned=unassigned,
        is_escalated=is_escalated,
        is_uncertain=is_uncertain,
        has_quality_warning=has_quality_warning,
        source_reliability=source_reliability,
        has_conflict=has_conflict,
        priority_tier=priority_tier,
        effective_polarity=effective_polarity,
        sort_by=sort_by,
        lookback_days=lookback_days,
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


@router.get(
    "/detected/{signal_instance_id}",
    response_model=DetectedSignalResponse,
    status_code=status.HTTP_200_OK,
)
async def get_detected_signal(
    signal_instance_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> DetectedSignalResponse:
    """
    Retrieves the full details, evidence payload, conflict analysis, and entity associations
    for a specific detected signal.
    """
    signal = await detected_signal_service.get_detected_signal(db, signal_instance_id)
    if not signal:
        raise NotFoundError(
            message=f"Detected signal with id '{signal_instance_id}' not found",
            details={"id": str(signal_instance_id)},
        )
    return signal


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
    Updates the status ('acknowledged', 'actioned', 'snoozed', 'dismissed', 'resolved')
    and optional resolution notes / snooze duration of a detected signal.
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


@router.post(
    "/detected/{signal_instance_id}/persons",
    response_model=DetectedSignalResponse,
    status_code=status.HTTP_200_OK,
)
async def link_person_to_signal(
    signal_instance_id: uuid.UUID,
    payload: SignalPersonLinkRequest,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> DetectedSignalResponse:
    """
    Links a person to a detected signal with a given role (e.g. interviewer, recruiter).
    """
    updated = await detected_signal_service.link_person_to_detected_signal(
        db,
        signal_instance_id=signal_instance_id,
        person_id=payload.person_id,
        role=payload.role,
    )
    if not updated:
        raise NotFoundError(
            message=f"Detected signal '{signal_instance_id}' or person '{payload.person_id}' not found",
            details={"signal_id": str(signal_instance_id), "person_id": str(payload.person_id)},
        )
    return updated


@router.delete(
    "/detected/{signal_instance_id}/persons/{person_id}",
    response_model=DetectedSignalResponse,
    status_code=status.HTTP_200_OK,
)
async def unlink_person_from_signal(
    signal_instance_id: uuid.UUID,
    person_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> DetectedSignalResponse:
    """
    Unlinks a person from a detected signal.
    """
    updated = await detected_signal_service.unlink_person_from_detected_signal(
        db,
        signal_instance_id=signal_instance_id,
        person_id=person_id,
    )
    if not updated:
        raise NotFoundError(
            message=f"Detected signal '{signal_instance_id}' not found",
            details={"signal_id": str(signal_instance_id), "person_id": str(person_id)},
        )
    return updated
