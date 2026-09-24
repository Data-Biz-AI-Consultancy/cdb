"""
cdb.services.account_briefs

AI Account Briefing Synthesis Service.
Generates comprehensive executive intelligence briefs for client companies, combining
firmographics, multi-threaded relationship health, active delivery engagements,
open pipeline deals, recent touchpoints, and active opportunity/risk signals.
"""

import datetime
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import NotFoundError
from cdb.models.activity import Activity
from cdb.models.base import utc_now
from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.opportunity import Opportunity, OpportunityCompany
from cdb.models.relationship import PersonCompanyRelationship
from cdb.schemas.account_brief import (
    AccountAIBriefResponse,
    AccountBriefEngagementItem,
    AccountBriefOpportunityItem,
    AccountBriefSignalItem,
    CommercialPosture,
)
from cdb.schemas.signals import DetectedSignalResponse, DetectedSignalStatus
from cdb.services.signals.detected.query import list_detected_signals
from cdb.services.signals.nba import generate_next_best_actions


def _synthesize_brief_narrative(
    company: Company,
    persons: list[PersonCompanyRelationship],
    engagements: list[Engagement],
    opportunities: list[Opportunity],
    activities: list[Activity],
    signals: list[DetectedSignalResponse],
) -> tuple[str, str, int, str, list[str]]:
    """
    Synthesizes executive summary, commercial posture, relationship health score,
    health rationale, and key highlights.
    """
    today = datetime.datetime.now(datetime.UTC).date()
    total_pipeline_val = sum(
        float(o.value or 0) for o in opportunities if o.stage not in ("closed_lost", "archived")
    )
    total_contract_val = sum(
        float(e.total_value or 0) for e in engagements if e.status not in ("cancelled", "archived")
    )

    active_engagements = [e for e in engagements if e.status in ("active", "in_delivery")]
    overdue_engagements = [
        e for e in active_engagements if e.expected_end_date and e.expected_end_date < today
    ]

    # Signal categorization
    active_risks = [
        s
        for s in signals
        if (s.effective_polarity or "").upper() == "RISK"
        or (s.signal and s.signal.category == "risk")
    ]
    active_opps = [
        s
        for s in signals
        if (s.effective_polarity or "").upper() == "OPPORTUNITY"
        or (s.signal and s.signal.category == "opportunity")
    ]
    has_p0_critical = any(
        s.severity == "critical" or s.priority_tier == "P0" or getattr(s, "is_escalated", False)
        for s in signals
    )

    # 1. Determine Commercial Posture
    if (
        has_p0_critical
        or len(overdue_engagements) > 0
        or (len(active_risks) >= 2 and len(active_opps) == 0)
    ):
        commercial_posture = CommercialPosture.AT_RISK
    elif any(s.signal_id == "dormant_strategic_account" for s in signals) or (
        not activities and not active_engagements
    ):
        commercial_posture = CommercialPosture.DORMANT
    elif (
        len(active_opps) > 0
        or total_pipeline_val > 50000
        or (active_engagements and not active_risks)
    ):
        commercial_posture = CommercialPosture.GROWING
    else:
        commercial_posture = CommercialPosture.STABLE

    # 2. Calculate Relationship Health Score (0-100)
    health = 80
    rationale_points: list[str] = []

    if active_engagements:
        health += 10
        rationale_points.append(f"{len(active_engagements)} active delivery engagement(s)")
    if len(persons) >= 3:
        health += 5
        rationale_points.append(f"Multi-threaded coverage ({len(persons)} contacts)")

    if has_p0_critical:
        health -= 25
        rationale_points.append("Critical P0 alert or SLA breach detected")
    elif active_risks:
        health -= len(active_risks) * 8
        rationale_points.append(f"{len(active_risks)} active relationship/contract risk signal(s)")

    if overdue_engagements:
        health -= 15
        rationale_points.append(f"{len(overdue_engagements)} delivery timeline overdue")

    if any(s.signal_id == "dormant_strategic_account" for s in signals):
        health -= 20
        rationale_points.append("Strategic account dormancy (>60 days inactive)")

    if any(s.signal_id == "hiring_funding_event" for s in signals):
        health += 5
        rationale_points.append("Recent hiring or funding expansion momentum")

    health_score = max(5, min(100, health))
    health_rationale = (
        "; ".join(rationale_points)
        if rationale_points
        else "Baseline relationship cadence maintained."
    )

    # 3. Key Highlights
    highlights: list[str] = []
    if company.industry:
        highlights.append(
            f"Operating in {company.industry} sector ({company.size_range or 'mid-market'})."
        )
    if total_contract_val > 0:
        highlights.append(
            f"Contracted revenue totaling EUR {total_contract_val:,.2f} across signed engagements."
        )
    if total_pipeline_val > 0:
        highlights.append(
            f"Active commercial pipeline of EUR {total_pipeline_val:,.2f} in active negotiation."
        )
    if activities:
        latest_act = activities[0]
        act_date = (
            latest_act.occurred_at.strftime("%b %d, %Y") if latest_act.occurred_at else "recent"
        )
        highlights.append(
            f"Last recorded touchpoint: '{latest_act.title or latest_act.summary or 'Client interaction'}' ({act_date})."
        )
    if len(persons) > 0:
        highlights.append(
            f"Key stakeholder touchpoints: {len(persons)} identified executive and operational contacts."
        )

    # 4. Synthesize Executive Narrative
    exec_paras: list[str] = []
    exec_paras.append(
        f"{company.name} is currently assessed under a **{commercial_posture.upper().replace('_', ' ')}** commercial posture "
        f"with an overall relationship health score of **{health_score}/100**."
    )

    if active_engagements:
        eng_titles = ", ".join(e.title for e in active_engagements[:2])
        exec_paras.append(
            f"Advisory and delivery operations are active under {len(active_engagements)} engagement(s) ({eng_titles}). "
            f"Revenue under contract is currently EUR {total_contract_val:,.2f}."
        )

    if active_risks:
        risk_bullets = "; ".join(
            f"{r.signal.name if r.signal else r.signal_id} ({r.severity.upper()})"
            for r in active_risks[:3]
        )
        exec_paras.append(
            f"⚠️ **Key Risk Factors**: Urgent attention is advised regarding {risk_bullets}. "
            f"Proactive intervention is recommended to prevent delivery friction and relationship atrophy."
        )

    if active_opps:
        opp_bullets = "; ".join(
            f"{o.signal.name if o.signal else o.signal_id}" for o in active_opps[:3]
        )
        exec_paras.append(
            f"💡 **Growth Upside**: Strategic opportunities identified in {opp_bullets}. "
            f"Commercial alignment presents strong expansion and contract renewal potential."
        )

    if not active_risks and not active_opps:
        exec_paras.append(
            "Account interactions remain steady with no critical polarity deviations or urgent escalation flags."
        )

    executive_summary = "\n\n".join(exec_paras)

    return executive_summary, commercial_posture, health_score, health_rationale, highlights


async def synthesize_account_brief(
    db: AsyncSession,
    company_id: uuid.UUID,
    force_refresh: bool = False,
) -> AccountAIBriefResponse:
    """
    Synthesizes or retrieves cached AI Account Brief for a given company.
    """
    # 1. Fetch Company
    company = (
        await db.execute(
            select(Company).where(Company.id == company_id, Company.deleted_at.is_(None))
        )
    ).scalar_one_or_none()
    if not company:
        raise NotFoundError(f"Company with id {company_id} not found.")

    # Check cached brief if not force_refresh
    if not force_refresh and company.attributes and "ai_account_brief" in company.attributes:
        cached_data = company.attributes["ai_account_brief"]
        if isinstance(cached_data, dict) and "executive_summary" in cached_data:
            try:
                cached_data["cached"] = True
                return AccountAIBriefResponse.model_validate(cached_data)
            except Exception:
                pass  # Recompute if deserialization fails

    # 2. Fetch Associated Records
    # Key Contacts / Relationships
    rel_stmt = select(PersonCompanyRelationship).where(
        PersonCompanyRelationship.company_id == company_id
    )
    relationships = (await db.execute(rel_stmt)).scalars().all()

    # Engagements
    eng_stmt = (
        select(Engagement)
        .where(Engagement.company_id == company_id)
        .order_by(Engagement.created_at.desc())
    )
    engagements = (await db.execute(eng_stmt)).scalars().all()

    # Opportunities
    opp_stmt = (
        select(Opportunity)
        .join(OpportunityCompany, OpportunityCompany.opportunity_id == Opportunity.id)
        .where(OpportunityCompany.company_id == company_id)
        .order_by(Opportunity.created_at.desc())
    )
    opportunities = (await db.execute(opp_stmt)).scalars().all()

    # Recent Activities (past 90 days)
    lookback_dt = utc_now() - datetime.timedelta(days=90)
    act_stmt = (
        select(Activity)
        .where(
            Activity.company_id == company_id,
            Activity.occurred_at >= lookback_dt,
        )
        .order_by(Activity.occurred_at.desc())
        .limit(20)
    )
    activities = (await db.execute(act_stmt)).scalars().all()

    # Detected Signals
    signals, _ = await list_detected_signals(
        db,
        company_id=company_id,
        status=DetectedSignalStatus.ACTIVE,
        limit=50,
    )
    ack_signals, _ = await list_detected_signals(
        db,
        company_id=company_id,
        status=DetectedSignalStatus.ACKNOWLEDGED,
        limit=50,
    )
    all_signals = signals + ack_signals

    # 3. Generate Ranked Next Best Actions
    ranked_actions = generate_next_best_actions(all_signals, company_name=company.name)

    # 4. Synthesize Narrative & Health Metrics
    exec_summary, posture, health_score, health_rationale, highlights = _synthesize_brief_narrative(
        company=company,
        persons=list(relationships),
        engagements=list(engagements),
        opportunities=list(opportunities),
        activities=list(activities),
        signals=all_signals,
    )

    # 5. Format Structured Opportunity & Risk Items
    key_risks: list[AccountBriefSignalItem] = []
    key_opps: list[AccountBriefSignalItem] = []

    for s in all_signals:
        why_now = (
            s.why_it_matters_now
            or (s.evidence.why_it_matters_now if s.evidence else None)
            or (s.evidence.excerpt if s.evidence else "Triggered by signal detection pattern.")
        )
        item = AccountBriefSignalItem(
            signal_id=s.signal_id,
            detected_signal_id=s.id,
            title=s.signal.name if s.signal else s.signal_id,
            category=s.signal.category if s.signal else "hybrid",
            effective_polarity=s.effective_polarity
            or ("RISK" if s.signal and s.signal.category == "risk" else "OPPORTUNITY"),
            severity=s.severity,
            priority_score=float(s.priority_score or s.score or 50.0),
            priority_tier=s.priority_tier or "P2",
            confidence_score=float(s.confidence_score or 0.8),
            why_it_matters=why_now,
            evidence_excerpt=s.evidence.excerpt if s.evidence else None,
            evidence_status=s.evidence.evidence_status if s.evidence else "fresh",
            occurred_at=s.evidence.occurred_at if s.evidence else None,
            days_elapsed=s.evidence.days_elapsed if s.evidence else None,
            recommended_action=s.signal.recommended_action
            if s.signal and s.signal.recommended_action
            else {},
            has_conflict=s.has_conflict,
            conflict_summary=s.conflict_summary if s.has_conflict else None,
            target_person_id=s.person_id,
            target_person_name=s.person_name,
        )

        if (s.effective_polarity or "").upper() == "RISK" or (
            s.signal and s.signal.category == "risk"
        ):
            key_risks.append(item)
        else:
            key_opps.append(item)

    # Sort risks and opps by priority_score descending
    key_risks.sort(key=lambda r: r.priority_score, reverse=True)
    key_opps.sort(key=lambda o: o.priority_score, reverse=True)

    # 6. Format Active Engagements and Open Pipeline Deals
    formatted_engs = [
        AccountBriefEngagementItem(
            id=e.id,
            title=e.title,
            status=e.status,
            contract_status=e.contract_status,
            expected_end_date=e.expected_end_date.isoformat() if e.expected_end_date else None,
            total_value=float(e.total_value) if e.total_value else None,
            currency=e.currency or "EUR",
        )
        for e in engagements
        if e.status in ("active", "in_delivery", "on_hold")
    ]

    formatted_opps = [
        AccountBriefOpportunityItem(
            id=o.id,
            title=o.title,
            stage=o.stage,
            value=float(o.value) if o.value else None,
            currency=o.currency or "EUR",
        )
        for o in opportunities
        if o.stage in ("prospect", "qualified", "proposal", "negotiation")
    ]

    brief_response = AccountAIBriefResponse(
        company_id=company.id,
        company_name=company.name,
        domain=company.domain,
        industry=company.industry,
        commercial_posture=posture,
        relationship_health_score=health_score,
        relationship_health_rationale=health_rationale,
        executive_summary=exec_summary,
        key_highlights=highlights,
        key_risks=key_risks,
        key_opportunities=key_opps,
        active_engagements=formatted_engs,
        open_pipeline_deals=formatted_opps,
        recommended_next_actions=ranked_actions[:10],
        generated_at=utc_now(),
        cached=False,
    )

    # 7. Persist to company attributes
    current_attrs = dict(company.attributes or {})
    current_attrs["ai_account_brief"] = brief_response.model_dump(mode="json")
    company.attributes = current_attrs
    await db.commit()

    return brief_response
