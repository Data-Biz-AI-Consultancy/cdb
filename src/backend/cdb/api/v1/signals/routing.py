import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user_or_api_key
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.schemas.signals import (
    DetectedSignalResponse,
    SignalAssignRequest,
    SignalCreateOpportunityRequest,
    SignalDeescalateRequest,
    SignalEscalateRequest,
    SignalWorkflowRouteRequest,
    SignalWorkflowRouteResponse,
)
from cdb.services.signals import (
    routing as signal_routing_service,
)

router = APIRouter()


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
