import datetime
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ActivityBase(BaseModel):
    person_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    engagement_id: uuid.UUID | None = None
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
        if not self.person_id and not self.company_id and not self.engagement_id:
            raise ValueError(
                "Activity must be linked to at least one person, company, or engagement."
            )
        return self


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    type: str | None = None
    occurred_at: datetime.datetime | None = None
    title: str | None = None
    summary: str | None = None
    raw_content: str | None = None
    engagement_id: uuid.UUID | None = None
    person_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    attributes: dict[str, Any] | None = None


class ActivityPersonSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str | None = None
    last_name: str | None = None
    primary_email: str | None = None
    avatar_url: str | None = None
    linkedin_url: str | None = None


class ActivityCompanySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    domain: str | None = None
    avatar_url: str | None = None
    industry: str | None = None


class ActivityTimelineBucket(BaseModel):
    date: str  # YYYY-MM-DD
    total: int
    by_type: dict[str, int] = Field(default_factory=dict)


class ActivityStatsResponse(BaseModel):
    total: int
    by_type: dict[str, int]
    by_source: dict[str, int]
    timeline: list[ActivityTimelineBucket] = Field(default_factory=list)


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    person_id: uuid.UUID | None = None
    company_id: uuid.UUID | None = None
    engagement_id: uuid.UUID | None = None
    person: ActivityPersonSummary | None = None
    company: ActivityCompanySummary | None = None
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
