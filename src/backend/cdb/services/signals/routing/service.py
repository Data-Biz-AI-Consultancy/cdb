"""
cdb.services.signals.routing.service

Signal ownership resolution rules, assignment, and escalation workflows.
"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cdb.core.errors import NotFoundError
from cdb.models.base import utc_now
from cdb.models.engagement import Engagement
from cdb.models.opportunity import Opportunity, OpportunityCompany
from cdb.models.signal import DetectedSignal, DetectedSignalPerson
from cdb.models.user import User
from cdb.schemas.signals import (
    DetectedSignalResponse,
    SignalDeescalateRequest,
    SignalEscalateRequest,
)
from cdb.services.signals.detected.mapper import to_detected_response


async def resolve_signal_owner(
    db: AsyncSession,
    company_id: uuid.UUID | None = None,
    opportunity_id: uuid.UUID | None = None,
    engagement_id: uuid.UUID | None = None,
) -> uuid.UUID | None:
    """
    Deterministically resolves the initial owner for a detected signal using
    a hierarchical ownership resolution rule engine:
    1. Direct active Engagement owner
    2. Direct open Opportunity owner
    3. Most recent active Engagement on the company
    4. Most recent open Opportunity on the company
    5. Most recent won deal / past engagement owner on the company
    6. Fallback: None (Unassigned queue)
    """
    # Rule 1: Direct Engagement Owner
    if engagement_id:
        stmt = select(Engagement.owner_id).where(
            Engagement.id == engagement_id, Engagement.owner_id.isnot(None)
        )
        owner = (await db.execute(stmt)).scalar_one_or_none()
        if owner:
            return owner

    # Rule 2: Direct Opportunity Owner
    if opportunity_id:
        stmt = select(Opportunity.owner_id).where(
            Opportunity.id == opportunity_id, Opportunity.owner_id.isnot(None)
        )
        owner = (await db.execute(stmt)).scalar_one_or_none()
        if owner:
            return owner

    # Rules 3-5: Company Context
    if company_id:
        # Rule 3: Active Engagement on Company
        eng_stmt = (
            select(Engagement.owner_id)
            .where(
                Engagement.company_id == company_id,
                Engagement.status.in_(["active", "in_delivery", "planning"]),
                Engagement.owner_id.isnot(None),
            )
            .order_by(Engagement.updated_at.desc())
            .limit(1)
        )
        eng_owner = (await db.execute(eng_stmt)).scalar_one_or_none()
        if eng_owner:
            return eng_owner

        # Rule 4: Open Opportunity on Company
        opp_stmt = (
            select(Opportunity.owner_id)
            .join(OpportunityCompany, OpportunityCompany.opportunity_id == Opportunity.id)
            .where(
                OpportunityCompany.company_id == company_id,
                Opportunity.stage.notin_(["closed_won", "closed_lost"]),
                Opportunity.owner_id.isnot(None),
            )
            .order_by(Opportunity.updated_at.desc())
            .limit(1)
        )
        opp_owner = (await db.execute(opp_stmt)).scalar_one_or_none()
        if opp_owner:
            return opp_owner

        # Rule 5: Most recent historical engagement or won deal owner
        hist_eng_stmt = (
            select(Engagement.owner_id)
            .where(
                Engagement.company_id == company_id,
                Engagement.owner_id.isnot(None),
            )
            .order_by(Engagement.updated_at.desc())
            .limit(1)
        )
        hist_eng_owner = (await db.execute(hist_eng_stmt)).scalar_one_or_none()
        if hist_eng_owner:
            return hist_eng_owner

    return None


def evaluate_signal_escalation(
    severity: str,
    priority_tier: str | None = None,
    score: float | int | None = None,
    key_metrics: dict[str, Any] | None = None,
) -> tuple[bool, str, str | None]:
    """
    Evaluates whether a detected signal requires automatic escalation based on:
    - P0 priority tier (composite score >= 90)
    - Critical SLA breach (e.g. unanswered message >= 7 days unreplied)
    - Critical severity on high-value accounts

    Returns:
        (is_escalated, escalation_level, escalation_reason)
    """
    key_metrics = key_metrics or {}
    days_unanswered = key_metrics.get("days_unanswered") or key_metrics.get("days_elapsed")

    # P0 Priority auto-escalation
    if priority_tier == "P0" or (score is not None and score >= 90):
        return (
            True,
            "critical",
            "Auto-escalated: P0 critical business impact signal requiring urgent executive intervention",
        )

    # SLA breach auto-escalation
    if severity == "critical" and days_unanswered is not None and days_unanswered >= 7:
        return (
            True,
            "critical",
            f"Auto-escalated: SLA breach — Conversation unanswered for {days_unanswered} days (exceeds 7-day critical threshold)",
        )

    return False, "none", None


async def assign_signal_owner(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
    owner_id: uuid.UUID | None,
    user: User | None = None,
) -> DetectedSignalResponse:
    """
    Assigns or re-assigns the owner of a detected signal.
    """
    stmt = (
        select(DetectedSignal)
        .where(DetectedSignal.id == signal_instance_id)
        .options(
            selectinload(DetectedSignal.signal),
            selectinload(DetectedSignal.company),
            selectinload(DetectedSignal.person),
            selectinload(DetectedSignal.opportunity),
            selectinload(DetectedSignal.engagement),
            selectinload(DetectedSignal.owner),
            selectinload(DetectedSignal.assigned_by),
            selectinload(DetectedSignal.escalated_to),
            selectinload(DetectedSignal.routed_opportunity),
            selectinload(DetectedSignal.signal_persons).selectinload(DetectedSignalPerson.person),
            selectinload(DetectedSignal.connected_persons),
        )
    )
    sig = (await db.execute(stmt)).scalar_one_or_none()
    if not sig:
        raise NotFoundError(f"Detected signal with id {signal_instance_id} not found.")

    if owner_id:
        target_user = (
            await db.execute(select(User).where(User.id == owner_id))
        ).scalar_one_or_none()
        if not target_user:
            raise NotFoundError(f"User with id {owner_id} not found.")

    now = utc_now()
    sig.owner_id = owner_id
    sig.assigned_at = now if owner_id else None
    sig.assigned_by_id = user.id if (user and owner_id) else None
    sig.updated_at = now

    await db.commit()
    await db.refresh(sig)
    return to_detected_response(sig)


async def escalate_signal(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
    payload: SignalEscalateRequest,
    user: User | None = None,
) -> DetectedSignalResponse:
    """
    Escalates a detected signal with justification reason and target recipient.
    """
    stmt = (
        select(DetectedSignal)
        .where(DetectedSignal.id == signal_instance_id)
        .options(
            selectinload(DetectedSignal.signal),
            selectinload(DetectedSignal.company),
            selectinload(DetectedSignal.person),
            selectinload(DetectedSignal.opportunity),
            selectinload(DetectedSignal.engagement),
            selectinload(DetectedSignal.owner),
            selectinload(DetectedSignal.assigned_by),
            selectinload(DetectedSignal.escalated_to),
            selectinload(DetectedSignal.routed_opportunity),
            selectinload(DetectedSignal.signal_persons).selectinload(DetectedSignalPerson.person),
            selectinload(DetectedSignal.connected_persons),
        )
    )
    sig = (await db.execute(stmt)).scalar_one_or_none()
    if not sig:
        raise NotFoundError(f"Detected signal with id {signal_instance_id} not found.")

    if payload.escalated_to_id:
        target_user = (
            await db.execute(select(User).where(User.id == payload.escalated_to_id))
        ).scalar_one_or_none()
        if not target_user:
            raise NotFoundError(f"User with id {payload.escalated_to_id} not found.")

    now = utc_now()
    sig.is_escalated = True
    sig.escalation_level = payload.escalation_level
    sig.escalated_to_id = payload.escalated_to_id
    sig.escalated_at = now
    sig.escalation_reason = payload.escalation_reason
    sig.updated_at = now

    await db.commit()
    await db.refresh(sig)
    return to_detected_response(sig)


async def deescalate_signal(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
    payload: SignalDeescalateRequest,
    user: User | None = None,
) -> DetectedSignalResponse:
    """
    De-escalates a signal and clears its escalation status.
    """
    stmt = (
        select(DetectedSignal)
        .where(DetectedSignal.id == signal_instance_id)
        .options(
            selectinload(DetectedSignal.signal),
            selectinload(DetectedSignal.company),
            selectinload(DetectedSignal.person),
            selectinload(DetectedSignal.opportunity),
            selectinload(DetectedSignal.engagement),
            selectinload(DetectedSignal.owner),
            selectinload(DetectedSignal.assigned_by),
            selectinload(DetectedSignal.escalated_to),
            selectinload(DetectedSignal.routed_opportunity),
            selectinload(DetectedSignal.signal_persons).selectinload(DetectedSignalPerson.person),
            selectinload(DetectedSignal.connected_persons),
        )
    )
    sig = (await db.execute(stmt)).scalar_one_or_none()
    if not sig:
        raise NotFoundError(f"Detected signal with id {signal_instance_id} not found.")

    now = utc_now()
    sig.is_escalated = False
    sig.escalation_level = "none"
    sig.escalated_to_id = None
    sig.escalated_at = None

    if payload.resolution_notes:
        existing = sig.resolution_notes or ""
        sig.resolution_notes = f"{existing}\n[De-escalated]: {payload.resolution_notes}".strip()

    sig.updated_at = now
    await db.commit()
    await db.refresh(sig)
    return to_detected_response(sig)
