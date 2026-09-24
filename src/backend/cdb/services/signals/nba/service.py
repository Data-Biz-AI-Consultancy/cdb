"""
cdb.services.signals.nba.service

Next Best Action generation orchestrator and database query endpoints.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.base import utc_now
from cdb.schemas.nba import (
    ActionUrgency,
    NextBestActionItem,
    NextBestActionListResponse,
)
from cdb.schemas.signals import DetectedSignalResponse, DetectedSignalStatus
from cdb.services.signals.detected.query import list_detected_signals
from cdb.services.signals.nba.reconciliation import (
    build_consolidated_person_action,
    build_reconciled_company_action,
    build_standalone_signal_action,
)


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

    # 1. Group signals by Account/Company to identify multi-signal clusters
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
            reconciled_action = build_reconciled_company_action(
                cid_str=cid_str,
                comp_signals=comp_signals,
                opp_signals=opp_signals,
                risk_signals=risk_signals,
                company_name=company_name,
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
                combined_action = build_consolidated_person_action(
                    pid_str=pid_str,
                    p_signals=p_signals,
                    company_name=company_name,
                )
                actions.append(combined_action)
            else:
                unassigned_person_signals.append(p_signals[0])

        # Process remaining standalone signals
        for s in unassigned_person_signals:
            act_item = build_standalone_signal_action(s, company_name=company_name)
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
