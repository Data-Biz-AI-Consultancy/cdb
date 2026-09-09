from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user_or_api_key
from cdb.core.database import get_db
from cdb.core.errors import NotFoundError
from cdb.models.user import User
from cdb.schemas.signals import (
    SignalCatalogResponse,
    SignalCategory,
    SignalDefinition,
    SignalSeverity,
    SignalTargetEntity,
)
from cdb.services.signals import catalog as signal_catalog_service

router = APIRouter(prefix="/signals", tags=["Signals"])


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
