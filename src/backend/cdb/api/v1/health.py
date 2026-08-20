from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_db
from cdb.core.config import settings
from cdb.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthResponse)
@router.get("/health", response_model=HealthResponse)
async def healthcheck(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        database=db_status,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )
