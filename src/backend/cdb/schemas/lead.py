import datetime
import uuid

from pydantic import BaseModel, ConfigDict


class LeadBase(BaseModel):
    person_id: uuid.UUID
    company_id: uuid.UUID | None = None
    owner_id: uuid.UUID | None = None
    title: str | None = None
    stage: str = "new"  # 'new' | 'contacted' | 'qualified' | 'converted' | 'disqualified'
    source: str | None = None  # 'linkedin_message' | 'referral' | 'inbound' | 'event' | 'manual'
    source_ref_id: str | None = None
    intent: str | None = None
    signal_strength: str | None = None  # 'strong' | 'medium' | 'weak'
    notes: str | None = None
    description: str | None = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    company_id: uuid.UUID | None = None
    owner_id: uuid.UUID | None = None
    title: str | None = None
    stage: str | None = None
    source: str | None = None
    source_ref_id: str | None = None
    intent: str | None = None
    signal_strength: str | None = None
    notes: str | None = None
    description: str | None = None
    disqualification_reason: str | None = None


class LeadAdvance(BaseModel):
    notes: str | None = None


class LeadDisqualify(BaseModel):
    reason: str  # e.g., 'wrong_timing', 'wrong_fit', 'no_budget', 'no_response'
    notes: str | None = None


class LeadConvert(BaseModel):
    title: str
    value: float | None = None
    currency: str | None = "EUR"
    expected_close_date: datetime.date | None = None


class LeadBulkUpdate(BaseModel):
    lead_ids: list[uuid.UUID]
    stage: str | None = None
    signal_strength: str | None = None
    source: str | None = None
    intent: str | None = None
    disqualification_reason: str | None = None
    append_notes: str | None = None
    notes: str | None = None
    description: str | None = None


class LeadBulkConvert(BaseModel):
    lead_ids: list[uuid.UUID]
    default_value: float | None = None
    currency: str | None = "EUR"
    expected_close_date: datetime.date | None = None
    title_suffix: str | None = "— Opportunity Deal"


class LeadBulkDisqualify(BaseModel):
    lead_ids: list[uuid.UUID]
    reason: (
        str  # e.g., 'wrong_fit', 'no_budget', 'no_response', 'wrong_timing', 'competitor_chosen'
    )
    notes: str | None = None


class LeadBulkDelete(BaseModel):
    lead_ids: list[uuid.UUID]


class LeadResponse(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str | None = None
    description: str | None = None
    person_name: str | None = None
    person_email: str | None = None
    person_avatar_url: str | None = None
    company_name: str | None = None
    company_domain: str | None = None
    disqualification_reason: str | None = None
    converted_at: datetime.datetime | None = None
    converted_opportunity_id: uuid.UUID | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
