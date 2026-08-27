import uuid

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.api.deps import get_current_user, require_admin
from cdb.core.database import get_db
from cdb.core.errors import BadRequestError
from cdb.models.user import User
from cdb.schemas.common import PaginatedResponse
from cdb.schemas.er import ERCandidatePairResponse, ERJobResponse, ERMergeResult
from cdb.services.entity_resolution import service as er_service

router = APIRouter(tags=["Entity Resolution"])



class ERResolveRequest(BaseModel):
    action: str = Field(..., description="'merge' | 'accept' | 'reject'")


@router.get("/queue", response_model=PaginatedResponse[ERCandidatePairResponse])
async def list_er_queue(
    status: str = Query("pending"),
    limit: int | None = Query(None, ge=1, le=200),
    page_size: int | None = Query(None, ge=1, le=200),
    cursor: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    effective_limit = limit or page_size or 50
    items, pagination = await er_service.list_er_queue(
        db, status=status, limit=effective_limit, cursor=cursor
    )
    return PaginatedResponse(data=items, pagination=pagination)


@router.post("/queue/{candidate_id}/accept", response_model=ERMergeResult)
async def accept_er_candidate(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await er_service.accept_er_candidate(db, candidate_id, current_user.id)


@router.post("/queue/{candidate_id}/reject", response_model=dict)
async def reject_er_candidate(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await er_service.reject_er_candidate(db, candidate_id, current_user.id)
    return {"status": "rejected"}


@router.post("/resolve/{candidate_id}", response_model=dict)
@router.post("/queue/{candidate_id}/resolve", response_model=dict)
async def resolve_er_candidate(
    candidate_id: uuid.UUID,
    payload: ERResolveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.action in ["merge", "accept"]:
        res = await er_service.accept_er_candidate(db, candidate_id, current_user.id)
        return {
            "status": "accepted",
            "master_person_id": str(res.master_person_id),
            "merged_person_id": str(res.merged_person_id),
        }
    elif payload.action == "reject":
        await er_service.reject_er_candidate(db, candidate_id, current_user.id)
        return {"status": "rejected"}
    else:
        raise BadRequestError(
            f"Invalid action '{payload.action}'. Expected 'merge', 'accept', or 'reject'."
        )


@router.post("/run", response_model=ERJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_er_run(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return await er_service.run_full_er_scan(db)

