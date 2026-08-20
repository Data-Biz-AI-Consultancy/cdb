import datetime
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ActivityBase(BaseModel):
    person_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    type: str  # 'meeting' | 'email' | 'linkedin_message' | 'whatsapp' | 'call' | 'note'
    source: str = "manual"  # 'notion' | 'gmail' | 'linkedin' | 'whatsapp' | 'manual'
    source_id: str | None = None
    occurred_at: datetime.datetime | None = None
    title: str | None = None
    summary: str | None = None
    raw_content: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def check_person_or_company(self) -> "ActivityBase":
        if not self.person_id and not self.company_id:
            raise ValueError("Activity must be linked to at least one person or company.")
        return self


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    type: str | None = None
    occurred_at: datetime.datetime | None = None
    title: str | None = None
    summary: str | None = None
    raw_content: str | None = None
    attributes: dict[str, Any] | None = None


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    person_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    type: str
    source: str
    source_id: str | None = None
    occurred_at: datetime.datetime
    title: str | None = None
    summary: str | None = None
    raw_content: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime.datetime
    updated_at: datetime.datetime
