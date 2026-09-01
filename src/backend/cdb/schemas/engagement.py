import datetime
import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EngagementPersonAttach(BaseModel):
    person_id: uuid.UUID
    role: str | None = None  # e.g., 'client_lead', 'technical_contact', 'stakeholder', 'consultant'


class EngagementActivityCreate(BaseModel):
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


class EngagementPersonResponse(BaseModel):
    person_id: uuid.UUID
    role: str | None = None
    person_name: str | None = None
    person_email: str | None = None
    person_avatar_url: str | None = None


class EngagementCompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    domain: str | None = None


class EngagementBase(BaseModel):
    title: str = Field(..., max_length=512)
    company_id: uuid.UUID
    opportunity_id: uuid.UUID | None = None
    owner_id: uuid.UUID | None = None
    status: str = (
        "active"  # 'planning' | 'active' | 'in_delivery' | 'on_hold' | 'completed' | 'cancelled'
    )
    engagement_type: str = "consultancy"  # 'consultancy' | 'retainer' | 'fixed_fee' | 'time_and_materials' | 'advisory' | 'full_time'
    rate_type: str = "daily"  # 'hourly' | 'daily' | 'monthly' | 'fixed'
    rate_value: Decimal | None = None
    currency: str = "EUR"
    total_value: Decimal | None = None
    contract_ref: str | None = None
    contract_status: str = (
        "signed"  # 'draft' | 'pending_signature' | 'signed' | 'expired' | 'terminated'
    )
    signed_at: datetime.date | None = None
    terms_and_conditions: str | None = None
    start_date: datetime.date | None = None
    expected_end_date: datetime.date | None = None
    actual_end_date: datetime.date | None = None
    notes: str | None = None
    description: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)


class EngagementCreate(EngagementBase):
    person_ids: list[EngagementPersonAttach] = Field(default_factory=list)


class EngagementUpdate(BaseModel):
    title: str | None = Field(None, max_length=512)
    company_id: uuid.UUID | None = None
    opportunity_id: uuid.UUID | None = None
    owner_id: uuid.UUID | None = None
    status: str | None = None
    engagement_type: str | None = None
    rate_type: str | None = None
    rate_value: Decimal | None = None
    currency: str | None = None
    total_value: Decimal | None = None
    contract_ref: str | None = None
    contract_status: str | None = None
    signed_at: datetime.date | None = None
    terms_and_conditions: str | None = None
    start_date: datetime.date | None = None
    expected_end_date: datetime.date | None = None
    actual_end_date: datetime.date | None = None
    notes: str | None = None
    description: str | None = None
    attributes: dict[str, Any] | None = None


class EngagementAISummaryActionItem(BaseModel):
    task: str
    priority: str = "medium"  # 'high' | 'medium' | 'low'
    suggested_role: str | None = None


class EngagementAISummaryResponse(BaseModel):
    executive_summary: str
    client_sentiment: str = (
        "positive"  # 'very_positive' | 'positive' | 'neutral' | 'needs_attention' | 'at_risk'
    )
    sentiment_reasoning: str
    key_highlights: list[str] = Field(default_factory=list)
    blockers_and_risks: list[str] = Field(default_factory=list)
    action_items: list[EngagementAISummaryActionItem] = Field(default_factory=list)
    activity_count_analyzed: int = 0
    generated_at: str


class EngagementResponse(EngagementBase):
    id: uuid.UUID
    created_at: datetime.datetime
    updated_at: datetime.datetime

    company: EngagementCompanyResponse | None = None
    persons: list[EngagementPersonResponse] = Field(default_factory=list)

    # Computed fields
    is_overdue: bool = False
    days_remaining: int | None = None
    days_elapsed: int | None = None
    recent_activity: str | None = None
    ai_summary: EngagementAISummaryResponse | None = None

    model_config = ConfigDict(from_attributes=True)
