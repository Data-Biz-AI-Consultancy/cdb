import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from cdb.schemas.nba import NextBestActionItem


class CommercialPosture(StrEnum):
    GROWING = "growing"
    STABLE = "stable"
    AT_RISK = "at_risk"
    DORMANT = "dormant"


class AccountBriefSignalItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    signal_id: str
    detected_signal_id: uuid.UUID
    title: str
    category: str
    effective_polarity: str
    severity: str
    priority_score: float
    priority_tier: str
    confidence_score: float
    why_it_matters: str
    evidence_excerpt: str | None = None
    evidence_status: str = "fresh"
    occurred_at: str | None = None
    days_elapsed: int | None = None
    recommended_action: dict[str, Any] = Field(default_factory=dict)
    has_conflict: bool = False
    conflict_summary: str | None = None
    target_person_id: uuid.UUID | None = None
    target_person_name: str | None = None


class AccountBriefEngagementItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    status: str
    contract_status: str
    expected_end_date: str | None = None
    total_value: float | None = None
    currency: str = "EUR"


class AccountBriefOpportunityItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    stage: str
    value: float | None = None
    currency: str = "EUR"


class AccountAIBriefResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_id: uuid.UUID
    company_name: str
    domain: str | None = None
    industry: str | None = None
    commercial_posture: str = Field(
        default=CommercialPosture.STABLE,
        description="Overall commercial trajectory: growing, stable, at_risk, dormant",
    )
    relationship_health_score: int = Field(
        default=80, ge=0, le=100, description="Overall health score (0-100)"
    )
    relationship_health_rationale: str = Field(
        ..., description="Explanation of factors driving relationship health"
    )
    executive_summary: str = Field(
        ..., description="Synthesized executive intelligence overview of the account"
    )
    key_highlights: list[str] = Field(default_factory=list)
    key_risks: list[AccountBriefSignalItem] = Field(default_factory=list)
    key_opportunities: list[AccountBriefSignalItem] = Field(default_factory=list)
    active_engagements: list[AccountBriefEngagementItem] = Field(default_factory=list)
    open_pipeline_deals: list[AccountBriefOpportunityItem] = Field(default_factory=list)
    recommended_next_actions: list[NextBestActionItem] = Field(default_factory=list)
    generated_at: datetime
    cached: bool = False
