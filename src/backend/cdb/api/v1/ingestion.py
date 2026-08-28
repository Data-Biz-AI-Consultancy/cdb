from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import require_api_key
from cdb.core.database import get_db
from cdb.schemas.ingestion import (
    IngestResponse,
    LinkedInConnectionsIngestRequest,
    LinkedInMessagesIngestRequest,
    NotionMeetingNotesIngestRequest,
)
from cdb.services.ingestion import ingestion as ingestion_service

router = APIRouter(prefix="/ingest", tags=["Ingestion"])


@router.post(
    "/linkedin-connections",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_linkedin_connections(
    payload: LinkedInConnectionsIngestRequest,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(require_api_key),
):
    return await ingestion_service.ingest_linkedin_connections(db, payload)


@router.post(
    "/linkedin-messages",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_linkedin_messages(
    payload: LinkedInMessagesIngestRequest,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(require_api_key),
):
    return await ingestion_service.ingest_linkedin_messages(db, payload)


@router.post(
    "/notion-meeting-notes",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def ingest_notion_meeting_notes(
    payload: NotionMeetingNotesIngestRequest,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(require_api_key),
):
    return await ingestion_service.ingest_notion_meeting_notes(db, payload)


@router.post(
    "/backfill",
    status_code=status.HTTP_200_OK,
)
async def trigger_backfill(
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(require_api_key),
):
    """
    Triggers a 1-off backfill across LinkedIn companies, LinkedIn conversations,
    Notion meeting notes, and person segmentation.
    """
    from cdb.services.ingestion.backfill import run_all_backfills

    return await run_all_backfills(db)
