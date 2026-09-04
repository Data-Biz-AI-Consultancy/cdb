import logging
from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import require_api_key
from cdb.core.config import settings
from cdb.core.database import get_db
from cdb.services.connectors.linkedin import LinkedInConnectorService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/connectors", tags=["Connectors"])


@router.get(
    "/linkedin/status",
    status_code=status.HTTP_200_OK,
)
async def get_linkedin_connector_status(
    api_key: str = Depends(require_api_key),
) -> dict[str, Any]:
    """Returns configuration and connection status for the LinkedIn connector."""
    is_configured = bool(settings.LINKEDIN_ACCESS_TOKEN)
    return {
        "connector": "linkedin",
        "configured": is_configured,
        "api_base_url": settings.LINKEDIN_API_BASE_URL,
        "api_version": settings.LINKEDIN_VERSION,
        "protocol_version": settings.LINKEDIN_RESTLI_PROTOCOL_VERSION,
    }


@router.post(
    "/linkedin/sync",
    status_code=status.HTTP_200_OK,
)
async def sync_linkedin_direct(
    async_run: bool = Query(
        default=False,
        description="Whether to run the sync as an asynchronous Celery background task.",
    ),
    sync_messages: bool = Query(default=True, description="Sync message conversations."),
    sync_connections: bool = Query(default=True, description="Sync network connections."),
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(require_api_key),
) -> dict[str, Any]:
    """
    Directly pulls messages and connections from LinkedIn Member Portability API into CDB.
    Maintains authentic timestamp fidelity (avoiding latency and timestamp overwriting from intermediate ETLs).
    """
    if async_run:
        try:
            from cdb.workers.tasks import sync_linkedin_direct_background

            task = sync_linkedin_direct_background.delay(
                sync_messages=sync_messages,
                sync_connections=sync_connections,
            )
            return {
                "status": "queued",
                "task_id": task.id,
                "message": "LinkedIn direct sync queued as Celery task.",
            }
        except Exception as exc:
            logger.warning("Could not dispatch Celery task, falling back to inline sync: %s", exc)

    service = LinkedInConnectorService()
    return await service.sync(
        db,
        sync_messages=sync_messages,
        sync_connections=sync_connections,
    )
