import datetime
import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CompanyBase(BaseModel):
    name: str
    domain: str | None = None
    industry: str | None = None
    size_range: str | None = None
    country: str | None = None
    city: str | None = None
    linkedin_url: str | None = None
    avatar_url: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = None
    domain: str | None = None
    industry: str | None = None
    size_range: str | None = None
    country: str | None = None
    city: str | None = None
    linkedin_url: str | None = None
    avatar_url: str | None = None
    attributes: dict[str, Any] | None = None


class CompanySummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    domain: str | None = None
    industry: str | None = None
    size_range: str | None = None
    country: str | None = None
    city: str | None = None
    contacts_count: int = 0
    leads_count: int = 0
    open_opportunities_count: int = 0
    total_opportunities_value: float = 0.0


class CompanyDetailResponse(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    contacts_count: int = 0
    leads_count: int = 0
    open_opportunities_count: int = 0
    total_opportunities_value: float = 0.0
    created_at: datetime.datetime
    updated_at: datetime.datetime
    deleted_at: datetime.datetime | None = None


class RelationshipCreate(BaseModel):
    company_id: uuid.UUID
    title: str | None = None
    is_current: bool = True
    started_at: datetime.date | None = None
    ended_at: datetime.date | None = None


class RelationshipUpdate(BaseModel):
    title: str | None = None
    is_current: bool | None = None
    started_at: datetime.date | None = None
    ended_at: datetime.date | None = None


class RelationshipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    person_id: uuid.UUID
    company_id: uuid.UUID
    title: str | None = None
    is_current: bool = True
    started_at: datetime.date | None = None
    ended_at: datetime.date | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime


class CompanyEmployeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    relationship_id: uuid.UUID
    person_id: uuid.UUID
    first_name: str | None = None
    last_name: str | None = None
    primary_email: str | None = None
    linkedin_url: str | None = None
    city: str | None = None
    country: str | None = None
    title: str | None = None
    is_current: bool = True
    started_at: datetime.date | None = None
    ended_at: datetime.date | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
