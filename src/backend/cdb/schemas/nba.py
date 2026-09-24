import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ActionUrgency(StrEnum):
    IMMEDIATE = "immediate"
    HIGH = "high"
    MEDIUM = "medium"
    ROUTINE = "routine"


class ActionType(StrEnum):
    SCHEDULE_SYNC = "schedule_sync"
    SEND_MESSAGE = "send_message"
    PREPARE_PROPOSAL = "prepare_proposal"
    EXECUTIVE_TOUCHPOINT = "executive_touchpoint"
    INTERNAL_ALIGNMENT = "internal_alignment"
    CONTRACT_RENEWAL = "contract_renewal"
    EXPANSION_PITCH = "expansion_pitch"
    RECONCILED_OUTREACH = "reconciled_outreach"


class NextBestActionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(
        ..., description="Unique deterministic or generated identifier for the action item"
    )
    action_type: str = Field(
        ..., description="Classification of action: schedule_sync, send_message, etc."
    )
    title: str = Field(..., description="Concise action title")
    description: str = Field(..., description="Detailed instructions for executing this action")
    rationale: str = Field(
        ..., description="Why this action matters now based on evidence and commercial impact"
    )
    priority_score: float = Field(
        ..., ge=0.0, le=100.0, description="Composite ranking score (0-100)"
    )
    priority_tier: str = Field(..., description="Priority tier: P0, P1, P2, P3, P4")
    urgency: str = Field(
        default=ActionUrgency.MEDIUM, description="Urgency level: immediate, high, medium, routine"
    )
    category: str = Field(
        default="opportunity",
        description="Action category: opportunity, risk, reconciled, operational",
    )

    suggested_owner_id: uuid.UUID | None = None
    suggested_owner_name: str | None = None
    target_company_id: uuid.UUID | None = None
    target_company_name: str | None = None
    target_person_id: uuid.UUID | None = None
    target_person_name: str | None = None
    target_opportunity_id: uuid.UUID | None = None
    target_opportunity_title: str | None = None
    target_engagement_id: uuid.UUID | None = None
    target_engagement_title: str | None = None

    originating_signal_ids: list[uuid.UUID] = Field(
        default_factory=list, description="IDs of detected signals informing this action"
    )
    originating_signals_summary: list[str] = Field(
        default_factory=list, description="Names and summaries of informing signals"
    )
    playbook_key: str | None = Field(
        default=None, description="Identifier of the recommended playbook"
    )

    is_reconciled_conflict: bool = Field(
        default=False, description="True if action resolves opposing signal polarities"
    )
    conflict_resolution_notes: str | None = Field(
        default=None, description="Explanation of how commercial tension was resolved"
    )
    freshness_status: str = Field(
        default="fresh",
        description="Freshness status of supporting context: fresh, stale, incomplete, conflicting, unverified",
    )
    action_steps: list[str] = Field(
        default_factory=list, description="Prescriptive sequential steps to complete this action"
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Additional contextual parameters and deep links"
    )


class NextBestActionListResponse(BaseModel):
    data: list[NextBestActionItem]
    total_count: int
    high_urgency_count: int = 0
    reconciled_count: int = 0
    generated_at: datetime
