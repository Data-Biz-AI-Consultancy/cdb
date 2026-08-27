from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user_or_api_key
from cdb.core.database import get_db
from cdb.models.user import User
from cdb.services.segmentation import service as segmentation_service

router = APIRouter(prefix="/segments", tags=["Segmentation"])


@router.post(
    "/evaluate",
    response_model=dict[str, Any],
    status_code=status.HTTP_200_OK,
)
async def evaluate_segments(
    db: AsyncSession = Depends(get_db),
    auth_user: User | None = Depends(get_current_user_or_api_key),
):
    """
    Evaluates dynamic person segments, engagement temperatures (hot/warm/dormant/cold),
    and GEO tags across all Contacts and Companies.
    """
    return await segmentation_service.evaluate_segments_and_temperature(db)
