import uuid
from datetime import datetime
from decimal import Decimal
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


class DetectedSignalStatus(StrEnum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    ACTIONED = "actioned"
    SNOOZED = "snoozed"
    DISMISSED = "dismissed"
    RESOLVED = "resolved"


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


class EntitySummary(BaseModel):
    id: uuid.UUID
    name: str | None = None
    title: str | None = None


class ConnectedPersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    primary_email: str | None = None
    role: str | None = None
    linkedin_url: str | None = None


class SuggestedPersonResponse(BaseModel):
    person_id: uuid.UUID | None = None
    name: str
    first_name: str | None = None
    role: str | None = None
    company_id: uuid.UUID | None = None
    company_name: str | None = None
    confidence: float | None = None


class SignalPersonLinkRequest(BaseModel):
    person_id: uuid.UUID
    role: str = "counterparty"


class SupportingEvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    evidence_type: str
    source_entity_type: str
    source_entity_id: str | None = None
    source_display: str | None = None
    trigger_event_title: str | None = None
    why_it_matters_now: str | None = None
    occurred_at: str | None = None
    days_elapsed: int | None = None
    excerpt: str | None = None
    evidence_status: str = "fresh"
    evidence_notes: list[str] = Field(default_factory=list)
    commercial_context: dict[str, Any] = Field(default_factory=dict)
    relationship_context: dict[str, Any] = Field(default_factory=dict)
    key_metrics: dict[str, Any] = Field(default_factory=dict)
    verification_status: str = "verified"


class DetectedSignalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: uuid.UUID
    signal_id: str
    signal: SignalDefinition | None = None

    company_id: uuid.UUID | None = None
    company_name: str | None = None
    person_id: uuid.UUID | None = None
    person_name: str | None = None
    connected_persons: list[ConnectedPersonResponse] = Field(default_factory=list)
    suggested_persons: list[SuggestedPersonResponse] = Field(default_factory=list)
    opportunity_id: uuid.UUID | None = None
    opportunity_title: str | None = None
    engagement_id: uuid.UUID | None = None
    engagement_title: str | None = None
    activity_id: uuid.UUID | None = None

    status: DetectedSignalStatus
    severity: SignalSeverity
    score: Decimal | None = None
    priority_score: Decimal | None = None
    priority_tier: str | None = None
    effective_polarity: str | None = None
    priority_breakdown: dict[str, Any] | None = None
    confidence_score: Decimal | None = None
    confidence_tier: str | None = None
    is_uncertain: bool = False
    uncertainty_reasons: list[str] = Field(default_factory=list)
    has_conflict: bool = False
    conflicting_signal_ids: list[str] = Field(default_factory=list)
    conflict_summary: str | None = None
    evidence: SupportingEvidenceResponse | dict[str, Any] | None = None
    why_it_matters_now: str | None = None
    evidence_fingerprint: str | None = None

    title: str
    summary: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict, validation_alias="metadata_payload")

    actioned_at: datetime | None = None
    actioned_by_id: uuid.UUID | None = None
    resolution_notes: str | None = None
    snoozed_until: datetime | None = None
    reopen_count: int = 0
    last_reopened_at: datetime | None = None
    detected_at: datetime
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class DetectedSignalUpdate(BaseModel):
    status: DetectedSignalStatus = Field(..., description="Target status for the detected signal")
    resolution_notes: str | None = Field(
        None, description="Optional notes detailing what action was taken or reason for dismissal"
    )
    snooze_days: int | None = Field(
        None, ge=1, le=365, description="Number of days to snooze the signal for"
    )
    snooze_until: datetime | None = Field(
        None, description="Exact timestamp until which the signal should remain snoozed"
    )


class BulkSignalStatusUpdateRequest(BaseModel):
    signal_ids: list[uuid.UUID] = Field(
        ..., min_length=1, description="List of signal IDs to update"
    )
    status: DetectedSignalStatus = Field(
        ..., description="Target status (dismissed, snoozed, resolved, etc.)"
    )
    resolution_notes: str | None = Field(
        None, description="Optional reason or resolution notes to apply"
    )
    snooze_days: int | None = Field(
        None, ge=1, le=365, description="Number of days to snooze if status is snoozed"
    )
    snooze_until: datetime | None = Field(
        None, description="Exact timestamp until which signals should remain snoozed"
    )


class BulkSignalStatusUpdateResponse(BaseModel):
    success: bool = True
    updated_count: int
    affected_ids: list[uuid.UUID]
    message: str


class GroupedDetectedSignalsItem(BaseModel):
    group_key: str
    group_name: str
    company_id: uuid.UUID | None = None
    total_signals: int
    signals: list[DetectedSignalResponse]


class GroupedDetectedSignalsResponse(BaseModel):
    data: list[GroupedDetectedSignalsItem]
    total_groups: int
    total_signals: int


class DetectedSignalStatsResponse(BaseModel):
    total_active: int
    total_snoozed: int = 0
    total_conflicting: int = 0
    total_uncertain: int = 0
    by_severity: dict[str, int]
    by_category: dict[str, int]
    by_signal: dict[str, int]
    by_status: dict[str, int]
    by_priority_tier: dict[str, int] = Field(default_factory=dict)
    by_effective_polarity: dict[str, int] = Field(default_factory=dict)


class SignalEvaluationResult(BaseModel):
    status: str = "success"
    evaluated_at: datetime
    lookback_days: int = 90
    total_active_signals: int
    total_snoozed_signals: int = 0
    total_suppressed_duplicates: int = 0
    total_reopened_signals: int = 0
    total_conflicting: int = 0
    total_uncertain: int = 0
    new_signals_detected: int
    refreshed_signals: int
    by_signal: dict[str, int]


class SignalQualityMetrics(BaseModel):
    total_detected: int = 0
    total_actioned: int = 0
    total_dismissed: int = 0
    total_resolved: int = 0
    total_snoozed: int = 0
    total_active: int = 0
    total_reopened: int = 0
    action_rate: float = 0.0
    dismissal_rate: float = 0.0
    precision_proxy: float = 0.0
    needs_verification_rate: float = 0.0
    conflict_rate: float = 0.0


class SignalLatencyMetrics(BaseModel):
    mean_time_to_action_hours: float | None = None
    median_time_to_action_hours: float | None = None
    sla_breach_count: int = 0
    sla_breach_rate: float = 0.0
    total_actioned_measured: int = 0


class SignalOutcomeMetrics(BaseModel):
    attribution_window_days: int = 90
    opportunities_created_count: int = 0
    opportunity_conversion_rate: float = 0.0
    account_reactivations_count: int = 0
    account_reactivation_rate: float = 0.0
    contracts_renewed_count: int = 0
    contract_renewal_rate: float = 0.0


class SignalRevenueMetrics(BaseModel):
    influenced_pipeline_total: Decimal = Decimal("0.00")
    weighted_influenced_pipeline_total: Decimal = Decimal("0.00")
    protected_revenue_total: Decimal = Decimal("0.00")
    currency: str = "USD"
    value_coverage_rate: float = 0.0


class SignalMetricsBreakdownItem(BaseModel):
    key: str
    label: str
    category: str | None = None
    severity: str | None = None
    total_detected: int = 0
    actioned_count: int = 0
    dismissed_count: int = 0
    snoozed_count: int = 0
    action_rate: float = 0.0
    mean_time_to_action_hours: float | None = None
    opportunities_created_count: int = 0
    influenced_pipeline: Decimal = Decimal("0.00")


class SignalMetricsResponse(BaseModel):
    lookback_days: int
    evaluated_at: datetime
    quality: SignalQualityMetrics
    latency: SignalLatencyMetrics
    outcomes: SignalOutcomeMetrics
    revenue: SignalRevenueMetrics
    by_signal: list[SignalMetricsBreakdownItem] = Field(default_factory=list)
    by_category: list[SignalMetricsBreakdownItem] = Field(default_factory=list)
    by_severity: list[SignalMetricsBreakdownItem] = Field(default_factory=list)
