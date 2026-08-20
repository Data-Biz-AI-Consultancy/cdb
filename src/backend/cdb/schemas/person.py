import datetime
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from cdb.schemas.company import CompanySummaryResponse


class PersonBase(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    primary_email: str | None = None
    secondary_emails: list[str] = Field(default_factory=list)
    primary_phone: str | None = None
    linkedin_url: str | None = None
    twitter_handle: str | None = None
    facebook_id: str | None = None
    whatsapp_phone: str | None = None
    city: str | None = None
    country: str | None = None
    avatar_url: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)


class PersonCreate(PersonBase):
    pass


class PersonUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    primary_email: str | None = None
    secondary_emails: list[str] | None = None
    primary_phone: str | None = None
    linkedin_url: str | None = None
    twitter_handle: str | None = None
    facebook_id: str | None = None
    whatsapp_phone: str | None = None
    city: str | None = None
    country: str | None = None
    avatar_url: str | None = None
    attributes: dict[str, Any] | None = None


class CareerItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    relationship_id: uuid.UUID
    company: CompanySummaryResponse
    title: str | None = None
    is_current: bool = True
    started_at: datetime.date | None = None
    ended_at: datetime.date | None = None


class PersonSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str | None = None
    last_name: str | None = None
    primary_email: str | None = None
    linkedin_url: str | None = None
    current_company: CompanySummaryResponse | None = None
    current_title: str | None = None
    sources: list[str] = Field(default_factory=list)
    last_activity_at: datetime.datetime | None = None
    created_at: datetime.datetime


class PersonDetailResponse(PersonBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sources: list[str] = Field(default_factory=list)
    source_ids: dict[str, Any] = Field(default_factory=dict)
    career: list[CareerItemResponse] = Field(default_factory=list)
    open_leads_count: int = 0
    open_opportunities_count: int = 0
    created_at: datetime.datetime
    updated_at: datetime.datetime
    deleted_at: datetime.datetime | None = None
