"""
cdb.services.signals.routing.workflows

Conversion and routing of detected signals into downstream CRM workflows:
- Commercial Opportunities
- Contract Renewal workflows
- Executive Outreach Touchpoints
Guarantees full context preservation (signal ID, evidence, affected account, contacts).
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cdb.core.errors import BadRequestError, NotFoundError
from cdb.models.base import utc_now
from cdb.models.signal import DetectedSignal, DetectedSignalPerson
from cdb.models.user import User
from cdb.schemas.opportunity import (
    OpportunityCompanyLink,
    OpportunityCreate,
    OpportunityPersonLink,
)
from cdb.schemas.signals import (
    SignalCreateOpportunityRequest,
    SignalWorkflowRouteRequest,
    SignalWorkflowRouteResponse,
)
from cdb.services.opportunities import create_opportunity
from cdb.services.signals.detected.mapper import to_detected_response


async def route_signal_to_opportunity(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
    payload: SignalCreateOpportunityRequest | None = None,
    user: User | None = None,
) -> SignalWorkflowRouteResponse:
    """
    Converts a detected signal directly into a commercial Opportunity while strictly
    preserving source signal context, affected account, contacts, and evidence.
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

    payload = payload or SignalCreateOpportunityRequest()
    meta = sig.metadata_payload or {}
    evidence = meta.get("evidence") or {}

    # 1. Resolve Opportunity Title
    comp_name = sig.company.name if sig.company else "Account"
    signal_name = sig.signal.name if sig.signal else "Signal"
    default_title = f"[{signal_name}] {comp_name} — Commercial Opportunity"
    opp_title = payload.title or default_title

    # 2. Resolve Owner
    opp_owner_id = payload.owner_id or sig.owner_id or (user.id if user else None)

    # 3. Build Rich Contextual Notes
    why_it_matters = (
        meta.get("why_it_matters_now")
        or (evidence.get("why_it_matters_now") if isinstance(evidence, dict) else None)
        or "High-impact opportunity detected requiring follow-up."
    )
    evidence_excerpt = (
        evidence.get("excerpt") if isinstance(evidence, dict) else None
    ) or sig.summary

    notes_lines = [
        "--- Originating Signal Context ---",
        f"• Signal: {sig.title} ({sig.signal_id})",
        f"• Severity: {sig.severity.upper()} | Priority Tier: {meta.get('priority_tier', 'P2')}",
        f"• Why It Matters: {why_it_matters}",
    ]
    if evidence_excerpt:
        notes_lines.append(f"• Evidence Excerpt: {evidence_excerpt}")
    if payload.notes:
        notes_lines.append(f"\nUser Notes:\n{payload.notes}")
    formatted_notes = "\n".join(notes_lines)

    # 4. Attach Affected Account
    company_ids: list[OpportunityCompanyLink] = []
    if sig.company_id:
        company_ids.append(OpportunityCompanyLink(company_id=sig.company_id, role="client"))

    # 5. Attach Connected / Relevant Contacts
    person_ids: list[OpportunityPersonLink] = []
    seen_persons: set[uuid.UUID] = set()

    if getattr(sig, "signal_persons", None):
        for sp in sig.signal_persons:
            if sp.person and not sp.person.is_internal and sp.person_id not in seen_persons:
                person_ids.append(
                    OpportunityPersonLink(person_id=sp.person_id, role=sp.role or "stakeholder")
                )
                seen_persons.add(sp.person_id)
    elif getattr(sig, "connected_persons", None):
        for cp in sig.connected_persons:
            if not cp.is_internal and cp.id not in seen_persons:
                person_ids.append(OpportunityPersonLink(person_id=cp.id, role="stakeholder"))
                seen_persons.add(cp.id)
    elif sig.person_id and sig.person and not sig.person.is_internal:
        person_ids.append(OpportunityPersonLink(person_id=sig.person_id, role="primary_contact"))
        seen_persons.add(sig.person_id)

    # 6. Construct Opportunity Creation Schema
    opp_create = OpportunityCreate(
        title=opp_title,
        owner_id=opp_owner_id,
        stage=payload.stage or "prospect",
        value=payload.value,
        currency=payload.currency or "EUR",
        probability=payload.probability,
        expected_close_date=payload.expected_close_date,
        notes=formatted_notes,
        description=f"Generated from Opportunity Signal: {sig.title}",
        company_ids=company_ids,
        person_ids=person_ids,
        attributes={
            "source_signal_id": str(sig.id),
            "source_signal_slug": sig.signal_id,
            "evidence_fingerprint": sig.evidence_fingerprint,
            "routed_from": "signal_workflow",
        },
    )

    # 7. Create Opportunity Record
    opp_response = await create_opportunity(
        db=db, data=opp_create, changed_by_id=user.id if user else opp_owner_id
    )

    # 8. Update DetectedSignal State & Bi-directional Linkage
    now = utc_now()
    sig.status = "actioned"
    sig.actioned_at = now
    if user:
        sig.actioned_by_id = user.id
    sig.routed_opportunity_id = opp_response.id
    sig.routed_workflow_type = "opportunity"
    sig.routed_at = now
    sig.resolution_notes = f"Routed to Opportunity: '{opp_response.title}' (ID: {opp_response.id})"
    sig.updated_at = now

    await db.commit()
    await db.refresh(sig)

    return SignalWorkflowRouteResponse(
        success=True,
        workflow_type="opportunity",
        routed_entity_id=opp_response.id,
        routed_entity_type="opportunity",
        signal=to_detected_response(sig),
        message=f"Successfully converted signal into Opportunity '{opp_response.title}'.",
    )


async def route_signal_to_workflow(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
    payload: SignalWorkflowRouteRequest,
    user: User | None = None,
) -> SignalWorkflowRouteResponse:
    """
    Generic dispatcher for routing signals into designated CRM follow-up workflows:
    - 'opportunity'
    - 'engagement_renewal'
    - 'executive_touchpoint'
    """
    if payload.workflow_type == "opportunity":
        return await route_signal_to_opportunity(
            db=db,
            signal_instance_id=signal_instance_id,
            payload=payload.opportunity_payload,
            user=user,
        )

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
    if payload.workflow_type in ["engagement_renewal", "executive_touchpoint"]:
        sig.status = "actioned"
        sig.actioned_at = now
        if user:
            sig.actioned_by_id = user.id
        sig.routed_workflow_type = payload.workflow_type
        sig.routed_at = now
        workflow_label = (
            "Contract Renewal"
            if payload.workflow_type == "engagement_renewal"
            else "Executive Touchpoint"
        )
        note_text = f"Routed to {workflow_label} workflow"
        if payload.notes:
            note_text += f": {payload.notes}"
        sig.resolution_notes = note_text
        sig.updated_at = now

        await db.commit()
        await db.refresh(sig)

        return SignalWorkflowRouteResponse(
            success=True,
            workflow_type=payload.workflow_type,
            routed_entity_id=sig.engagement_id
            if payload.workflow_type == "engagement_renewal"
            else sig.company_id,
            routed_entity_type="engagement"
            if payload.workflow_type == "engagement_renewal"
            else "company",
            signal=to_detected_response(sig),
            message=f"Successfully routed signal into {workflow_label} workflow.",
        )

    raise BadRequestError(f"Unsupported workflow type: '{payload.workflow_type}'.")
