"""
cdb.services.signals.nba.reconciliation

Constructs deduplicated stakeholder outreach actions, reconciled conflict actions,
and prescriptive standalone actions.
"""

from cdb.schemas.nba import ActionType, NextBestActionItem
from cdb.schemas.signals import DetectedSignalResponse
from cdb.services.signals.nba.playbooks import DEFAULT_PLAYBOOKS
from cdb.services.signals.nba.scoring import calculate_action_priority_score


def build_reconciled_company_action(
    cid_str: str,
    comp_signals: list[DetectedSignalResponse],
    opp_signals: list[DetectedSignalResponse],
    risk_signals: list[DetectedSignalResponse],
    company_name: str | None = None,
) -> NextBestActionItem:
    """
    Builds a unified strategic alignment action when opposing polarities (Opportunity & Risk)
    co-occur on the same account.
    """
    highest_pri_sig = max(
        comp_signals,
        key=lambda s: float(s.priority_score or s.score or 0.0),
    )
    score, tier, urgency = calculate_action_priority_score(
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

    has_explicit_conflict = any(s.has_conflict for s in comp_signals)

    return NextBestActionItem(
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


def build_consolidated_person_action(
    pid_str: str,
    p_signals: list[DetectedSignalResponse],
    company_name: str | None = None,
) -> NextBestActionItem:
    """
    Deduplicates multiple signals targeting the exact same person into a single unified outreach.
    """
    primary_sig = max(p_signals, key=lambda s: float(s.priority_score or s.score or 0.0))
    score, tier, urgency = calculate_action_priority_score(primary_sig)
    p_name = primary_sig.person_name or "Key Contact"
    sig_titles = " & ".join(s.signal.name if s.signal else s.signal_id for s in p_signals)

    return NextBestActionItem(
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
        freshness_status=primary_sig.evidence.evidence_status if primary_sig.evidence else "fresh",
        action_steps=[
            f"Review conversation logs and historical touchpoints with {p_name}",
            "Draft combined message addressing all pending topics and meeting action items",
            "Send single comprehensive update or invitation",
        ],
    )


def build_standalone_signal_action(
    s: DetectedSignalResponse,
    company_name: str | None = None,
) -> NextBestActionItem:
    """
    Builds a prescriptive NextBestActionItem for a single detected signal.
    """
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
        recommended_dict.get("playbook") or playbook_info.get("playbook_key") or "standard_playbook"
    )
    steps = playbook_info.get("steps") or [
        "Review supporting evidence and trigger criteria",
        "Prepare outreach materials or internal briefing",
        "Execute recommended playbook step",
    ]

    score, tier, urgency = calculate_action_priority_score(s)
    freshness = s.evidence.evidence_status if s.evidence else "fresh"

    why_now = (
        s.why_it_matters_now
        or (s.evidence.why_it_matters_now if s.evidence else None)
        or (s.evidence.excerpt if s.evidence else "Triggered by active signal detection rule.")
    )

    return NextBestActionItem(
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
