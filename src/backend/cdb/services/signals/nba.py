"""
cdb.services.signals.nba

Next Best Action (NBA) Ranking, Action Deduplication, and Conflict Reconciliation Engine.
Transforms detected opportunity and risk signals, relationship milestones, and commercial context
into prioritized, deduplicated, and actionable advisory playbooks.
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.base import utc_now
from cdb.schemas.nba import (
    ActionType,
    ActionUrgency,
    NextBestActionItem,
    NextBestActionListResponse,
)
from cdb.schemas.signals import DetectedSignalResponse, DetectedSignalStatus
from cdb.services.signals.detected.query import list_detected_signals

# Default prescriptive playbooks per signal type
DEFAULT_PLAYBOOKS: dict[str, dict[str, Any]] = {
    "dormant_strategic_account": {
        "playbook_key": "executive_touchpoint",
        "action_type": ActionType.SCHEDULE_SYNC,
        "title": "Schedule Executive Check-In or QBR",
        "description": "Reach out to past client sponsors with a relevant industry benchmark, new architectural case study, or offer a complimentary advisory check-in.",
        "steps": [
            "Review past engagement deliverables and executive sponsors",
            "Select relevant recent case study or industry benchmark",
            "Send personalized check-in email proposing a 30-minute strategic review",
        ],
    },
    "unanswered_conversation": {
        "playbook_key": "rapid_response",
        "action_type": ActionType.SEND_MESSAGE,
        "title": "Reply to Open Conversation Thread",
        "description": "Triage unanswered message thread immediately; draft and send a thoughtful reply addressing the client inquiry.",
        "steps": [
            "Review inbound message thread context and any pending requests",
            "Formulate detailed response with proposed next steps or meeting times",
            "Send reply via original communication channel",
        ],
    },
    "expiring_contract": {
        "playbook_key": "contract_renewal",
        "action_type": ActionType.PREPARE_PROPOSAL,
        "title": "Initiate Contract Extension & Scope Review",
        "description": "Draft extension proposal or schedule a scope review with the client procurement lead before the contract expiration milestone.",
        "steps": [
            "Audit current delivery milestones and remaining budget runway",
            "Draft contract extension addendum with updated rate terms and scope",
            "Schedule proposal presentation with account sponsor",
        ],
    },
    "leadership_change": {
        "playbook_key": "executive_reengagement",
        "action_type": ActionType.EXECUTIVE_TOUCHPOINT,
        "title": "Congratulate Contact & Establish Executive Cadence",
        "description": "Acknowledge contact promotion or transition to a new organization and establish senior partnership alignment.",
        "steps": [
            "Verify new role, title, and organization affiliation",
            "Draft congratulatory note emphasizing advisory continuity",
            "Propose introductory briefing on high-priority data/AI initiatives",
        ],
    },
    "hiring_funding_event": {
        "playbook_key": "expansion_pitch",
        "action_type": ActionType.EXECUTIVE_TOUCHPOINT,
        "title": "Propose Team Augmentation or Architecture Strategy",
        "description": "Engage executive leadership regarding recent funding allocation or engineering hiring expansion with tailored consulting capabilities.",
        "steps": [
            "Analyze public funding round details or posted job openings",
            "Align consulting practice capabilities with scaling bottlenecks",
            "Share bespoke practice deck and request discovery discussion",
        ],
    },
    "competitor_signal": {
        "playbook_key": "competitive_differentiation",
        "action_type": ActionType.INTERNAL_ALIGNMENT,
        "title": "Reinforce Value Proposition & Competitive Differentiation",
        "description": "Brief internal deal team on competitor positioning, address pricing or RFP considerations, and schedule executive sponsor touchpoint.",
        "steps": [
            "Review competitor mentions and deal stage notes",
            "Prepare competitive differentiation matrix highlighting specialized domain expertise",
            "Schedule executive alignment call to address client evaluation criteria",
        ],
    },
}


def _calculate_action_priority_score(
    sig: DetectedSignalResponse,
    is_conflict_reconciled: bool = False,
) -> tuple[float, str, str]:
    """
    Computes weighted ranking score (0-100), Priority Tier (P0-P4), and Urgency.
    """
    base_score = float(sig.priority_score) if sig.priority_score is not None else 50.0
    if sig.score is not None and sig.priority_score is None:
        base_score = float(sig.score)

    confidence = float(sig.confidence_score) if sig.confidence_score is not None else 0.8
    confidence_multiplier = 0.7 + (0.3 * min(1.0, max(0.0, confidence)))

    # Urgency boost based on SLA or severity
    urgency_boost = 0.0
    if sig.severity == "critical" or getattr(sig, "is_escalated", False):
        urgency_boost += 15.0
        urgency = ActionUrgency.IMMEDIATE
    elif sig.severity == "high":
        urgency_boost += 8.0
        urgency = ActionUrgency.HIGH
    elif sig.severity == "medium":
        urgency = ActionUrgency.MEDIUM
    else:
        urgency = ActionUrgency.ROUTINE

    # Freshness penalty if evidence is stale or unverified
    freshness_penalty = 0.0
    if getattr(sig, "is_uncertain", False):
        freshness_penalty += 10.0
    if sig.evidence and sig.evidence.evidence_status == "stale":
        freshness_penalty += 8.0

    # Conflict reconciled bonus for holistic strategy
    conflict_boost = 10.0 if is_conflict_reconciled else 0.0

    composite = (
        (base_score * confidence_multiplier) + urgency_boost + conflict_boost - freshness_penalty
    )
    composite = min(100.0, max(0.0, round(composite, 1)))

    # Assign tier
    if composite >= 90.0 or getattr(sig, "is_escalated", False) or sig.severity == "critical":
        tier = "P0"
        urgency = ActionUrgency.IMMEDIATE
    elif composite >= 75.0:
        tier = "P1"
        if urgency == ActionUrgency.ROUTINE:
            urgency = ActionUrgency.HIGH
    elif composite >= 50.0:
        tier = "P2"
    elif composite >= 25.0:
        tier = "P3"
    else:
        tier = "P4"

    return composite, tier, urgency


def generate_next_best_actions(
    signals: list[DetectedSignalResponse],
    company_name: str | None = None,
) -> list[NextBestActionItem]:
    """
    Synthesizes ranked, deduplicated, and conflict-reconciled Next Best Actions
    from a collection of detected signals.
    """
    actionable_signals = [
        s
        for s in signals
        if s.status in (DetectedSignalStatus.ACTIVE, DetectedSignalStatus.ACKNOWLEDGED)
    ]

    if not actionable_signals:
        return []

    actions: list[NextBestActionItem] = []

    # 1. Group signals by Account/Company and Person to identify multi-signal clusters
    signals_by_company: dict[str, list[DetectedSignalResponse]] = {}
    for s in actionable_signals:
        key = str(s.company_id) if s.company_id else "global"
        signals_by_company.setdefault(key, []).append(s)

    for cid_str, comp_signals in signals_by_company.items():
        # Check for opposing polarity conflicts within company (Risk vs Opportunity)
        has_opp = any(
            (s.effective_polarity or "").upper() == "OPPORTUNITY"
            or (s.signal and s.signal.category == "opportunity")
            for s in comp_signals
        )
        has_risk = any(
            (s.effective_polarity or "").upper() == "RISK"
            or (s.signal and s.signal.category == "risk")
            for s in comp_signals
        )
        has_explicit_conflict = any(s.has_conflict for s in comp_signals)

        is_company_conflict = (has_opp and has_risk) or has_explicit_conflict

        # If there's a strong conflict across co-occurring signals on the company,
        # build a Reconciled Strategic Action that addresses both dimensions.
        if is_company_conflict and len(comp_signals) >= 2:
            opp_signals = [
                s
                for s in comp_signals
                if (s.effective_polarity or "").upper() == "OPPORTUNITY"
                or (s.signal and s.signal.category == "opportunity")
            ]
            risk_signals = [
                s
                for s in comp_signals
                if (s.effective_polarity or "").upper() == "RISK"
                or (s.signal and s.signal.category == "risk")
            ]

            highest_pri_sig = max(
                comp_signals,
                key=lambda s: float(s.priority_score or s.score or 0.0),
            )
            score, tier, urgency = _calculate_action_priority_score(
                highest_pri_sig, is_conflict_reconciled=True
            )

            acc_name = comp_signals[0].company_name or company_name or "Account"
            opp_names = (
                ", ".join(s.signal.name if s.signal else s.signal_id for s in opp_signals)
                or "Commercial Opportunity"
            )
            risk_names = (
                ", ".join(s.signal.name if s.signal else s.signal_id for s in risk_signals)
                or "Relationship Risk"
            )

            reconciled_action = NextBestActionItem(
                id=f"nba_reconciled_{cid_str[:8]}",
                action_type=ActionType.RECONCILED_OUTREACH,
                title=f"Unified Executive Alignment: Harmonize Growth ({opp_names}) & Mitigate ({risk_names})",
                description=(
                    f"Account {acc_name} has co-occurring opportunity and risk signals. Reconcile outreach "
                    f"by acknowledging positive momentum while proactively addressing active SLA/contract risks."
                ),
                rationale=(
                    f"Simultaneous detection of Opportunity ({opp_names}) and Risk ({risk_names}). "
                    f"Coordinating outreach prevents contradictory guidance and reinforces senior advisory stewardship."
                ),
                priority_score=score,
                priority_tier=tier,
                urgency=urgency,
                category="reconciled",
                suggested_owner_id=highest_pri_sig.owner_id,
                suggested_owner_name=highest_pri_sig.owner_name,
                target_company_id=highest_pri_sig.company_id,
                target_company_name=highest_pri_sig.company_name or company_name,
                target_person_id=highest_pri_sig.person_id,
                target_person_name=highest_pri_sig.person_name,
                target_opportunity_id=highest_pri_sig.opportunity_id,
                target_opportunity_title=highest_pri_sig.opportunity_title,
                target_engagement_id=highest_pri_sig.engagement_id,
                target_engagement_title=highest_pri_sig.engagement_title,
                originating_signal_ids=[s.id for s in comp_signals],
                originating_signals_summary=[
                    f"[{s.signal.name if s.signal else s.signal_id}] {s.effective_polarity or 'SIGNAL'}: {s.why_it_matters_now or (s.evidence.excerpt if s.evidence else '')}"
                    for s in comp_signals
                ],
                playbook_key="reconciled_strategic_alignment",
                is_reconciled_conflict=True,
                conflict_resolution_notes=(
                    f"Merged {len(comp_signals)} active signals into unified strategic outreach agenda, "
                    f"eliminating opposing outreach directives."
                ),
                freshness_status="conflicting" if has_explicit_conflict else "fresh",
                action_steps=[
                    "Review combined evidence dossier across both opportunity and risk dimensions",
                    "Formulate dual-agenda briefing (celebrate growth/funding milestones + resolve contract/communication blockers)",
                    "Conduct executive sync with primary account sponsor to align roadmap",
                ],
                metadata={
                    "opp_signal_count": len(opp_signals),
                    "risk_signal_count": len(risk_signals),
                },
            )
            actions.append(reconciled_action)

        # 2. Process individual signals or stakeholder-deduplicated signals
        # Group by target person to avoid multiple uncoordinated emails/calls to the same contact
        signals_by_person: dict[str, list[DetectedSignalResponse]] = {}
        unassigned_person_signals: list[DetectedSignalResponse] = []

        for s in comp_signals:
            if s.person_id:
                signals_by_person.setdefault(str(s.person_id), []).append(s)
            else:
                unassigned_person_signals.append(s)

        # Merge same-person signals
        for pid_str, p_signals in signals_by_person.items():
            if len(p_signals) > 1:
                # Deduplicate into a combined stakeholder action
                primary_sig = max(
                    p_signals, key=lambda s: float(s.priority_score or s.score or 0.0)
                )
                score, tier, urgency = _calculate_action_priority_score(primary_sig)
                p_name = primary_sig.person_name or "Key Contact"
                sig_titles = " & ".join(
                    s.signal.name if s.signal else s.signal_id for s in p_signals
                )

                combined_action = NextBestActionItem(
                    id=f"nba_person_{pid_str[:8]}",
                    action_type=ActionType.EXECUTIVE_TOUCHPOINT,
                    title=f"Consolidated Contact Outreach for {p_name} ({sig_titles})",
                    description=(
                        f"Engage {p_name} regarding multiple co-occurring events: "
                        + "; ".join(s.signal.name if s.signal else s.signal_id for s in p_signals)
                    ),
                    rationale=f"Multiple active signals target {p_name}. A unified touchpoint avoids communication fatigue.",
                    priority_score=score,
                    priority_tier=tier,
                    urgency=urgency,
                    category=primary_sig.signal.category if primary_sig.signal else "opportunity",
                    suggested_owner_id=primary_sig.owner_id,
                    suggested_owner_name=primary_sig.owner_name,
                    target_company_id=primary_sig.company_id,
                    target_company_name=primary_sig.company_name or company_name,
                    target_person_id=primary_sig.person_id,
                    target_person_name=p_name,
                    target_opportunity_id=primary_sig.opportunity_id,
                    target_opportunity_title=primary_sig.opportunity_title,
                    target_engagement_id=primary_sig.engagement_id,
                    target_engagement_title=primary_sig.engagement_title,
                    originating_signal_ids=[s.id for s in p_signals],
                    originating_signals_summary=[
                        f"{s.signal.name if s.signal else s.signal_id}: {s.why_it_matters_now or ''}"
                        for s in p_signals
                    ],
                    playbook_key="consolidated_contact_touchpoint",
                    is_reconciled_conflict=any(s.has_conflict for s in p_signals),
                    conflict_resolution_notes="Merged multiple contact-level requests into a single unified agenda.",
                    freshness_status=primary_sig.evidence.evidence_status
                    if primary_sig.evidence
                    else "fresh",
                    action_steps=[
                        f"Review conversation logs and historical touchpoints with {p_name}",
                        "Draft combined message addressing all pending topics and meeting action items",
                        "Send single comprehensive update or invitation",
                    ],
                )
                actions.append(combined_action)
            else:
                # Single signal targeting this person
                unassigned_person_signals.append(p_signals[0])

        # Process remaining standalone signals
        for s in unassigned_person_signals:
            # If already included in a reconciled company action, we can keep standalone actions as sub-tasks if distinct
            sig_def = s.signal
            sig_id = s.signal_id
            playbook_info = DEFAULT_PLAYBOOKS.get(sig_id, {})
            recommended_dict = (sig_def.recommended_action if sig_def else {}) or {}

            action_type = (
                recommended_dict.get("action_type")
                or playbook_info.get("action_type")
                or ActionType.EXECUTIVE_TOUCHPOINT
            )
            title = (
                recommended_dict.get("title")
                or playbook_info.get("title")
                or f"Action Playbook: {sig_def.name if sig_def else sig_id}"
            )
            desc = (
                recommended_dict.get("description")
                or playbook_info.get("description")
                or "Review and execute recommended playbook action."
            )
            playbook_key = (
                recommended_dict.get("playbook")
                or playbook_info.get("playbook_key")
                or "standard_playbook"
            )
            steps = playbook_info.get("steps") or [
                "Review supporting evidence and trigger criteria",
                "Prepare outreach materials or internal briefing",
                "Execute recommended playbook step",
            ]

            score, tier, urgency = _calculate_action_priority_score(s)
            freshness = s.evidence.evidence_status if s.evidence else "fresh"

            why_now = (
                s.why_it_matters_now
                or (s.evidence.why_it_matters_now if s.evidence else None)
                or (
                    s.evidence.excerpt
                    if s.evidence
                    else "Triggered by active signal detection rule."
                )
            )

            act_item = NextBestActionItem(
                id=f"nba_{str(s.id)[:8]}",
                action_type=str(action_type),
                title=title,
                description=desc,
                rationale=why_now,
                priority_score=score,
                priority_tier=tier,
                urgency=urgency,
                category=sig_def.category if sig_def else "opportunity",
                suggested_owner_id=s.owner_id,
                suggested_owner_name=s.owner_name,
                target_company_id=s.company_id,
                target_company_name=s.company_name or company_name,
                target_person_id=s.person_id,
                target_person_name=s.person_name,
                target_opportunity_id=s.opportunity_id,
                target_opportunity_title=s.opportunity_title,
                target_engagement_id=s.engagement_id,
                target_engagement_title=s.engagement_title,
                originating_signal_ids=[s.id],
                originating_signals_summary=[f"[{sig_def.name if sig_def else sig_id}]: {why_now}"],
                playbook_key=playbook_key,
                is_reconciled_conflict=s.has_conflict,
                conflict_resolution_notes=s.conflict_summary if s.has_conflict else None,
                freshness_status=freshness,
                action_steps=steps,
                metadata={
                    "signal_slug": sig_id,
                    "confidence_score": float(s.confidence_score) if s.confidence_score else None,
                    "evidence_type": s.evidence.evidence_type if s.evidence else None,
                },
            )
            actions.append(act_item)

    # Sort actions by priority_score descending, then urgency
    urgency_order = {
        ActionUrgency.IMMEDIATE: 4,
        ActionUrgency.HIGH: 3,
        ActionUrgency.MEDIUM: 2,
        ActionUrgency.ROUTINE: 1,
    }
    actions.sort(
        key=lambda a: (a.priority_score, urgency_order.get(ActionUrgency(a.urgency), 0)),
        reverse=True,
    )

    return actions


async def get_company_next_best_actions(
    db: AsyncSession,
    company_id: uuid.UUID,
) -> NextBestActionListResponse:
    """
    Fetches active detected signals for a company and generates ranked Next Best Actions.
    """
    signals, _ = await list_detected_signals(
        db,
        company_id=company_id,
        status=DetectedSignalStatus.ACTIVE,
        limit=100,
    )

    # Also include acknowledged signals
    ack_signals, _ = await list_detected_signals(
        db,
        company_id=company_id,
        status=DetectedSignalStatus.ACKNOWLEDGED,
        limit=100,
    )
    all_signals = signals + ack_signals

    actions = generate_next_best_actions(all_signals)
    high_urgency = sum(
        1 for a in actions if a.urgency in (ActionUrgency.IMMEDIATE, ActionUrgency.HIGH)
    )
    reconciled_count = sum(1 for a in actions if a.is_reconciled_conflict)

    return NextBestActionListResponse(
        data=actions,
        total_count=len(actions),
        high_urgency_count=high_urgency,
        reconciled_count=reconciled_count,
        generated_at=utc_now(),
    )


async def get_global_next_best_actions(
    db: AsyncSession,
    limit: int = 50,
    owner_id: uuid.UUID | None = None,
) -> NextBestActionListResponse:
    """
    Generates a global feed of Next Best Actions across all active signals.
    """
    signals, _ = await list_detected_signals(
        db,
        status=DetectedSignalStatus.ACTIVE,
        owner_id=owner_id,
        limit=200,
    )

    actions = generate_next_best_actions(signals)
    if limit and len(actions) > limit:
        actions = actions[:limit]

    high_urgency = sum(
        1 for a in actions if a.urgency in (ActionUrgency.IMMEDIATE, ActionUrgency.HIGH)
    )
    reconciled_count = sum(1 for a in actions if a.is_reconciled_conflict)

    return NextBestActionListResponse(
        data=actions,
        total_count=len(actions),
        high_urgency_count=high_urgency,
        reconciled_count=reconciled_count,
        generated_at=utc_now(),
    )
