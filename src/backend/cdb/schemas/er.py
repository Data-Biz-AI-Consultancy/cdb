import datetime
import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from cdb.schemas.person import PersonSummaryResponse


class ERCandidatePairResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    person_a: PersonSummaryResponse
    person_b: PersonSummaryResponse
    match_signals: dict[str, Any] = Field(default_factory=dict)
    ml_score: Decimal | None = None
    status: str
    reviewed_by: uuid.UUID | None = None
    reviewed_at: datetime.datetime | None = None
    created_at: datetime.datetime


class ERMergeResult(BaseModel):
    master_person_id: uuid.UUID
    merged_person_id: uuid.UUID


class ERJobResponse(BaseModel):
    job_id: str
    status: str
