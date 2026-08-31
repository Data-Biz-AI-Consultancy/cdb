import datetime
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OpportunityActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class OpportunityHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    opportunity_id: uuid.UUID
    action_id: str
    action: OpportunityActionResponse | None = None
    changed_by_id: uuid.UUID | None = None
    field_name: str | None = None
    old_value: Any | None = None
    new_value: Any | None = None
    changes: dict[str, Any] = Field(default_factory=dict)
    summary: str | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class OpportunityHistoryCreate(BaseModel):
    action_id: str
    field_name: str | None = None
    old_value: Any | None = None
    new_value: Any | None = None
    changes: dict[str, Any] = Field(default_factory=dict)
    summary: str | None = None
    changed_by_id: uuid.UUID | None = None


class OpportunityNoteCreate(BaseModel):
    note: str
