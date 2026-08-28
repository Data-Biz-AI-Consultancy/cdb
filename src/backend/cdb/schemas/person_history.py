import datetime
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PersonActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str
    description: str | None = None
    icon: str | None = None
    color: str | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PersonHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    person_id: uuid.UUID
    action_id: str
    action: PersonActionResponse | None = None
    changed_by_id: uuid.UUID | None = None
    field_name: str | None = None
    old_value: Any | None = None
    new_value: Any | None = None
    changes: dict[str, Any] = Field(default_factory=dict)
    summary: str | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class PersonHistoryCreate(BaseModel):
    action_id: str
    field_name: str | None = None
    old_value: Any | None = None
    new_value: Any | None = None
    changes: dict[str, Any] = Field(default_factory=dict)
    summary: str | None = None
    changed_by_id: uuid.UUID | None = None
