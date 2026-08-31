import datetime
import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OpportunityPersonLink(BaseModel):
    person_id: uuid.UUID
    role: str | None = None  # 'decision_maker', 'champion', 'influencer', etc.


class OpportunityCompanyLink(BaseModel):
    company_id: uuid.UUID
    role: str | None = None  # 'client', 'partner', 'vendor', etc.


class OpportunityPersonAttach(BaseModel):
    person_id: uuid.UUID
    role: str | None = "decision_maker"


class OpportunityCompanyAttach(BaseModel):
    company_id: uuid.UUID
    role: str | None = "client"


class OpportunityBase(BaseModel):
    title: str
    owner_id: uuid.UUID | None = None
    stage: str = "prospect"  # 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
    value: Decimal | None = None
    currency: str | None = "EUR"
    probability: int | None = Field(default=None, ge=0, le=100)
    expected_close_date: datetime.date | None = None
    source_lead_id: uuid.UUID | None = None
    notes: str | None = None
    description: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)


class OpportunityCreate(OpportunityBase):
    person_ids: list[OpportunityPersonLink] = Field(default_factory=list)
    company_ids: list[OpportunityCompanyLink] = Field(default_factory=list)


class OpportunityUpdate(BaseModel):
    title: str | None = None
    owner_id: uuid.UUID | None = None
    stage: str | None = None
    value: Decimal | None = None
    currency: str | None = None
    probability: int | None = Field(default=None, ge=0, le=100)
    expected_close_date: datetime.date | None = None
    notes: str | None = None
    description: str | None = None
    attributes: dict[str, Any] | None = None


class OpportunityClose(BaseModel):
    outcome: str  # 'closed_won' | 'closed_lost'
    notes: str | None = None


class OpportunityPersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    person_id: uuid.UUID
    role: str | None = None
    person_name: str | None = None
    person_email: str | None = None
    person_avatar_url: str | None = None


class OpportunityCompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_id: uuid.UUID
    role: str | None = None
    company_name: str | None = None
    company_domain: str | None = None


class OpportunityResponse(OpportunityBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    persons: list[OpportunityPersonResponse] = Field(default_factory=list)
    companies: list[OpportunityCompanyResponse] = Field(default_factory=list)
    created_at: datetime.datetime
    updated_at: datetime.datetime
    is_stale: bool = False
    is_expired: bool = False
    days_inactive: int = 0
    staleness_status: str = (
        "active"  # 'active' | 'stale' | 'expired' | 'closed_won' | 'closed_lost'
    )
    last_activity_at: datetime.datetime | None = None
