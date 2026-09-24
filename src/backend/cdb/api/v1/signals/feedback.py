import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user_or_api_key
from cdb.core.database import get_db
from cdb.core.errors import NotFoundError
from cdb.models.user import User
from cdb.schemas.common import PaginatedResponse, PaginationMetadata
from cdb.schemas.signals import (
    SignalFeedbackCreate,
    SignalFeedbackResponse,
    SignalFeedbackUpdate,
)
from cdb.services.signals import (
    feedback as signal_feedback_service,
)

router = APIRouter()


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
