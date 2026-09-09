from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SignalCategory(StrEnum):
    OPPORTUNITY = "opportunity"
    RISK = "risk"
    HYBRID = "hybrid"


class SignalTargetEntity(StrEnum):
    COMPANY = "company"
    PERSON = "person"
    OPPORTUNITY = "opportunity"
    ENGAGEMENT = "engagement"


class SignalSeverity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class DetectionMechanism(StrEnum):
    DETERMINISTIC_RULE = "deterministic_rule"
    TEMPORAL_CADENCE = "temporal_cadence"
    TEXT_PATTERN = "text_pattern"
    ENRICHMENT_FEED = "enrichment_feed"


class RecommendedAction(BaseModel):
    playbook: str
    action_type: str
    title: str
    description: str


class SignalDefinition(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique slug identifier for the signal")
    name: str = Field(..., description="Human-readable display name of the signal")
    category: SignalCategory = Field(
        ..., description="Signal classification: opportunity, risk, or hybrid"
    )
    target_entity: SignalTargetEntity = Field(
        ...,
        description="Entity type that this signal targets: company, person, opportunity, or engagement",
    )
    severity: SignalSeverity = Field(
        default=SignalSeverity.MEDIUM, description="Default urgency/severity level"
    )
    detection_mechanism: DetectionMechanism = Field(
        default=DetectionMechanism.DETERMINISTIC_RULE,
        description="Mechanism used to detect the signal",
    )
    description: str | None = Field(default=None, description="Short summary of the signal")
    business_interpretation: str = Field(
        ..., description="Detailed business interpretation and commercial impact"
    )
    parameters: dict[str, Any] = Field(
        default_factory=dict, description="Default triggering parameters and threshold criteria"
    )
    recommended_action: dict[str, Any] = Field(
        default_factory=dict,
        description="Actionable playbook instructions and recommended next best action",
    )
    icon: str | None = Field(default=None, description="Display icon/emoji")
    color: str | None = Field(default=None, description="Accent color theme")
    is_active: bool = Field(default=True, description="Whether the signal definition is active")
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SignalCatalogSummary(BaseModel):
    total_signals: int
    by_category: dict[str, int]
    by_target_entity: dict[str, int]
    by_severity: dict[str, int]


class SignalCatalogResponse(BaseModel):
    data: list[SignalDefinition]
    summary: SignalCatalogSummary
