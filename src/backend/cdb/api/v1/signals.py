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
    BulkSignalStatusUpdateRequest,
    BulkSignalStatusUpdateResponse,
    DetectedSignalResponse,
    DetectedSignalStatsResponse,
    DetectedSignalStatus,
    DetectedSignalUpdate,
    GroupedDetectedSignalsResponse,
    SignalAssignRequest,
    SignalCatalogResponse,
    SignalCategory,
    SignalCreateOpportunityRequest,
    SignalDeescalateRequest,
    SignalDefinition,
    SignalEscalateRequest,
    SignalEvaluationResult,
    SignalFeedbackCreate,
    SignalFeedbackResponse,
    SignalFeedbackUpdate,
    SignalMetricsResponse,
    SignalPersonLinkRequest,
    SignalSeverity,
    SignalTargetEntity,
    SignalWorkflowRouteRequest,
    SignalWorkflowRouteResponse,
)
from cdb.services.signals import (
    catalog as signal_catalog_service,
)
from cdb.services.signals import (
    compute_signal_success_metrics,
)
from cdb.services.signals import (
    detected as detected_signal_service,
)
from cdb.services.signals import (
    detector as detector_service,
)
from cdb.services.signals import (
    feedback as signal_feedback_service,
)
from cdb.services.signals import (
    routing as signal_routing_service,
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


# ─────────────────────────────────────────────────────────────────────────────
# 3. Detected Signals (Fact / Bridge Instances)
# ─────────────────────────────────────────────────────────────────────────────


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
    "/detected/{signal_instance_id}/feedback",
    response_model=SignalFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_signal_feedback(
    signal_instance_id: uuid.UUID,
    payload: SignalFeedbackCreate,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> SignalFeedbackResponse:
    """
    Submits false-positive or data quality feedback on a detected signal.
    Optionally dismisses the signal and logs an investigation audit record.
    """
    feedback = await signal_feedback_service.create_signal_feedback(
        db, signal_id=signal_instance_id, payload=payload, user=auth_user
    )
    if not feedback:
        raise NotFoundError(
            message=f"Detected signal with id '{signal_instance_id}' not found",
            details={"id": str(signal_instance_id)},
        )
    return feedback


@router.get(
    "/feedback",
    response_model=PaginatedResponse[SignalFeedbackResponse],
    status_code=status.HTTP_200_OK,
)
async def list_signal_feedback(
    status_filter: str | None = Query(
        None,
        alias="status",
        description="Filter by feedback status (pending, investigated, resolved, rejected)",
    ),
    feedback_reason: str | None = Query(None, description="Filter by feedback reason"),
    signal_id: uuid.UUID | None = Query(None, description="Filter by detected signal instance ID"),
    page: int = Query(1, ge=1, description="1-indexed page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> PaginatedResponse[SignalFeedbackResponse]:
    """
    Lists and filters false-positive and data quality feedback entries for monitoring and investigation.
    """
    offset = (page - 1) * page_size
    items, total = await signal_feedback_service.list_signal_feedback(
        db,
        status=status_filter,
        feedback_reason=feedback_reason,
        signal_id=signal_id,
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
    "/feedback/{feedback_id}",
    response_model=SignalFeedbackResponse,
    status_code=status.HTTP_200_OK,
)
async def update_feedback_investigation(
    feedback_id: uuid.UUID,
    payload: SignalFeedbackUpdate,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> SignalFeedbackResponse:
    """
    Updates the investigation status ('pending', 'investigated', 'resolved', 'rejected')
    and investigation notes for a false-positive feedback entry.
    """
    updated = await signal_feedback_service.update_feedback_investigation(
        db, feedback_id=feedback_id, payload=payload, user=auth_user
    )
    if not updated:
        raise NotFoundError(
            message=f"Signal feedback with id '{feedback_id}' not found",
            details={"id": str(feedback_id)},
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


# ─────────────────────────────────────────────────────────────────────────────
# 4. Signal Ownership, Escalation & Workflow Routing Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.post(
    "/detected/{signal_instance_id}/assign",
    response_model=DetectedSignalResponse,
    status_code=status.HTTP_200_OK,
)
async def assign_detected_signal_owner(
    signal_instance_id: uuid.UUID,
    payload: SignalAssignRequest,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> DetectedSignalResponse:
    """
    Assigns or re-assigns the owner of a detected signal.
    """
    return await signal_routing_service.assign_signal_owner(
        db, signal_instance_id, payload.owner_id, user=auth_user
    )


@router.post(
    "/detected/{signal_instance_id}/escalate",
    response_model=DetectedSignalResponse,
    status_code=status.HTTP_200_OK,
)
async def escalate_detected_signal(
    signal_instance_id: uuid.UUID,
    payload: SignalEscalateRequest,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> DetectedSignalResponse:
    """
    Escalates a detected signal with justification reason and target recipient.
    """
    return await signal_routing_service.escalate_signal(
        db, signal_instance_id, payload, user=auth_user
    )


@router.post(
    "/detected/{signal_instance_id}/de-escalate",
    response_model=DetectedSignalResponse,
    status_code=status.HTTP_200_OK,
)
async def deescalate_detected_signal(
    signal_instance_id: uuid.UUID,
    payload: SignalDeescalateRequest,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> DetectedSignalResponse:
    """
    De-escalates a signal and clears its escalation status.
    """
    return await signal_routing_service.deescalate_signal(
        db, signal_instance_id, payload, user=auth_user
    )


@router.post(
    "/detected/{signal_instance_id}/create-opportunity",
    response_model=SignalWorkflowRouteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_opportunity_from_signal(
    signal_instance_id: uuid.UUID,
    payload: SignalCreateOpportunityRequest,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> SignalWorkflowRouteResponse:
    """
    Converts a detected signal directly into a commercial Opportunity while strictly
    preserving source signal context, affected account, contacts, and evidence.
    """
    return await signal_routing_service.route_signal_to_opportunity(
        db, signal_instance_id, payload=payload, user=auth_user
    )


@router.post(
    "/detected/{signal_instance_id}/route-workflow",
    response_model=SignalWorkflowRouteResponse,
    status_code=status.HTTP_200_OK,
)
async def route_signal_to_crm_workflow(
    signal_instance_id: uuid.UUID,
    payload: SignalWorkflowRouteRequest,
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
) -> SignalWorkflowRouteResponse:
    """
    Routes a detected signal into designated CRM follow-up workflows ('opportunity',
    'engagement_renewal', 'executive_touchpoint').
    """
    return await signal_routing_service.route_signal_to_workflow(
        db, signal_instance_id, payload=payload, user=auth_user
    )
