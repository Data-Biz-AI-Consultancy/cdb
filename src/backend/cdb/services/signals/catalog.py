from collections.abc import Sequence

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.signal import Signal
from cdb.schemas.signals import (
    SignalCatalogResponse,
    SignalCatalogSummary,
    SignalCategory,
    SignalDefinition,
    SignalSeverity,
    SignalTargetEntity,
)

INITIAL_SIGNAL_CATALOG: list[dict] = [
    {
        "id": "dormant_strategic_account",
        "name": "Dormant Strategic Account",
        "category": "risk",
        "target_entity": "company",
        "severity": "high",
        "detection_mechanism": "temporal_cadence",
        "description": "Identifies valuable or strategic accounts with no recorded interactions over an extended period.",
        "business_interpretation": (
            "In consulting and advisory, repeat business and account expansion represent 60-80% of revenue. "
            "When a strategic account becomes dormant, relationship context atrophies, executive sponsors drift away, "
            "and competitors can penetrate the account without visibility. Dormancy is the leading indicator of client churn."
        ),
        "parameters": {
            "warning_days": 60,
            "critical_days": 90,
            "qualifying_criteria": [
                "has_signed_engagement",
                "has_closed_won_opportunity",
                "segment:clients_and_prospects",
            ],
        },
        "recommended_action": {
            "playbook": "executive_touchpoint",
            "action_type": "schedule_sync",
            "title": "Schedule Executive Check-In or QBR",
            "description": (
                "Reach out to past client sponsors with a relevant industry benchmark, new architectural case study, "
                "or offer a complimentary advisory check-in."
            ),
        },
        "icon": "💤",
        "color": "amber",
        "is_active": True,
    },
    {
        "id": "unanswered_conversation",
        "name": "Unanswered Conversation",
        "category": "risk",
        "target_entity": "person",
        "severity": "critical",
        "detection_mechanism": "temporal_cadence",
        "description": "Inbound client or prospect message awaiting our reply beyond the target SLA.",
        "business_interpretation": (
            "Lead conversion probability and client trust decline precipitously with response latency. "
            "Dropping an inbound thread or failing to follow up on a meeting action item signals operational slack, "
            "forfeits deal momentum, and severely harms professional credibility."
        ),
        "parameters": {
            "warning_days": 3,
            "critical_days": 7,
            "channels": ["linkedin_message", "email", "whatsapp", "notion_todo"],
        },
        "recommended_action": {
            "playbook": "rapid_response",
            "action_type": "send_message",
            "title": "Reply to Open Thread",
            "description": (
                "Triage the unanswered message thread immediately; draft and send a thoughtful reply "
                "or schedule the requested call."
            ),
        },
        "icon": "⏳",
        "color": "red",
        "is_active": True,
    },
    {
        "id": "expiring_contract",
        "name": "Expiring Contract",
        "category": "hybrid",
        "target_entity": "engagement",
        "severity": "high",
        "detection_mechanism": "temporal_cadence",
        "description": "Active consulting engagement or retainer approaching its scheduled end date.",
        "business_interpretation": (
            "Fixed-term consulting contracts require renewal lead time. If extension discussions do not commence "
            "30-60 days prior to contract expiration, client procurement cycles and quarterly budget reallocations "
            "cause billable interruptions or account loss. It also represents the prime window for scope expansion and rate reviews."
        ),
        "parameters": {
            "early_warning_days": 60,
            "urgent_renewal_days": 30,
            "target_contract_statuses": ["signed", "active", "in_delivery"],
        },
        "recommended_action": {
            "playbook": "contract_renewal",
            "action_type": "prepare_proposal",
            "title": "Initiate Contract Renewal & Scope Review",
            "description": (
                "Schedule a project wrap/renewal milestone meeting with the delivery sponsor; prepare an extension "
                "Statement of Work (SOW) or retainer expansion proposal."
            ),
        },
        "icon": "📅",
        "color": "orange",
        "is_active": True,
    },
    {
        "id": "leadership_change",
        "name": "Leadership Change",
        "category": "hybrid",
        "target_entity": "person",
        "severity": "high",
        "detection_mechanism": "deterministic_rule",
        "description": "Executive sponsor or decision-maker role transition, departure, or new hire.",
        "business_interpretation": (
            "B2B consulting services are bought by people, not logos. When an internal champion departs, ongoing "
            "projects and future renewals are vulnerable to budget freezes. Conversely, a champion joining a new "
            "company creates an immediate warm pipeline, while a newly hired executive at a target account brings a fresh "
            "mandate and budget for change."
        ),
        "parameters": {
            "executive_title_keywords": ["CTO", "Chief", "VP", "Head of", "Director", "Lead"],
            "lookback_days": 60,
        },
        "recommended_action": {
            "playbook": "stakeholder_remapping",
            "action_type": "outreach_and_mapping",
            "title": "Congratulate Transitioned Leader & Map Successor",
            "description": (
                "If a champion moved, congratulate them at their new firm to explore new opportunities; concurrently "
                "identify and build rapport with the incoming successor at the client account."
            ),
        },
        "icon": "🔄",
        "color": "blue",
        "is_active": True,
    },
    {
        "id": "hiring_funding_event",
        "name": "Hiring or Funding Event",
        "category": "opportunity",
        "target_entity": "company",
        "severity": "medium",
        "detection_mechanism": "text_pattern",
        "description": "Target account announced a new funding round or initiated an aggressive technical hiring wave.",
        "business_interpretation": (
            "Fresh capital investment (Seed, Series A/B, PE) or aggressive hiring in data and AI signals strategic expansion "
            "coupled with urgent execution pressure. Because hiring permanent engineers takes 3 to 6 months, these accounts "
            "experience acute capacity bottlenecks where high-impact advisory or specialized consulting can immediately accelerate timelines."
        ),
        "parameters": {
            "funding_keywords": [
                "seed",
                "series a",
                "series b",
                "series c",
                "raised",
                "funding round",
                "venture",
            ],
            "hiring_keywords": [
                "hiring data",
                "growing the team",
                "headcount",
                "analytics engineer",
                "data engineer",
            ],
        },
        "recommended_action": {
            "playbook": "growth_acceleration",
            "action_type": "tailored_pitch",
            "title": "Pitch Rapid Delivery & Capability Acceleration",
            "description": (
                "Reach out to technical leadership with a tailored proposal offering team augmentation or architectural "
                "roadmap sprint during their growth phase."
            ),
        },
        "icon": "🚀",
        "color": "emerald",
        "is_active": True,
    },
    {
        "id": "competitor_signal",
        "name": "Competitor Signal",
        "category": "risk",
        "target_entity": "opportunity",
        "severity": "high",
        "detection_mechanism": "text_pattern",
        "description": "Prospect or client is actively evaluating, engaging, or piloting solutions with alternative consultancies or competing tech stacks.",
        "business_interpretation": (
            "Competitor presence in an active deal or client account introduces margin pressure, extended evaluation "
            "cycles, and displacement risk. Early detection enables proactive value re-framing, stakeholder alignment, "
            "and deployment of differentiation battlecards before procurement decisions crystallize."
        ),
        "parameters": {
            "competitor_keywords": [
                "talking to another",
                "evaluating alternative",
                "competing proposal",
                "bake-off",
                "RFP",
                "cheaper alternative",
                "other consultancy",
                "other agency",
            ]
        },
        "recommended_action": {
            "playbook": "competitive_defense",
            "action_type": "battlecard_activation",
            "title": "Activate Competitive Battlecard & Re-anchor Value",
            "description": (
                "Review competitor differentiation matrix; schedule an alignment call with the executive sponsor emphasizing "
                "unique consulting ROI, rapid time-to-value, and specialized architecture expertise."
            ),
        },
        "icon": "⚔️",
        "color": "purple",
        "is_active": True,
    },
]


async def ensure_signals_dimension(db: AsyncSession) -> None:
    """
    Ensures all default signals in INITIAL_SIGNAL_CATALOG exist in the dimension table.
    Guarantees dimension records exist in both test environments and fresh databases.
    """
    existing_signals = (await db.execute(select(Signal.id))).scalars().all()
    existing_set = set(existing_signals)

    added = False
    for sig in INITIAL_SIGNAL_CATALOG:
        if sig["id"] not in existing_set:
            db_signal = Signal(
                id=sig["id"],
                name=sig["name"],
                category=sig["category"],
                target_entity=sig["target_entity"],
                severity=sig["severity"],
                detection_mechanism=sig["detection_mechanism"],
                description=sig.get("description"),
                business_interpretation=sig["business_interpretation"],
                parameters=sig.get("parameters", {}),
                recommended_action=sig.get("recommended_action", {}),
                icon=sig.get("icon"),
                color=sig.get("color"),
                is_active=sig.get("is_active", True),
            )
            db.add(db_signal)
            added = True

    if added:
        await db.flush()


async def get_signals_from_db(
    db: AsyncSession,
    category: SignalCategory | None = None,
    target_entity: SignalTargetEntity | None = None,
    severity: SignalSeverity | None = None,
    active_only: bool = True,
) -> Sequence[Signal]:
    """
    Fetch signal definitions from the PostgreSQL dimension table with optional filtering.
    """
    await ensure_signals_dimension(db)
    stmt: Select = select(Signal)
    if active_only:
        stmt = stmt.where(Signal.is_active.is_(True))
    if category:
        stmt = stmt.where(Signal.category == category.value)
    if target_entity:
        stmt = stmt.where(Signal.target_entity == target_entity.value)
    if severity:
        stmt = stmt.where(Signal.severity == severity.value)

    stmt = stmt.order_by(Signal.category, Signal.name)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_signal_by_id(db: AsyncSession, signal_id: str) -> Signal | None:
    """
    Fetch a single signal definition by slug ID from the dimension table.
    """
    await ensure_signals_dimension(db)
    stmt = select(Signal).where(Signal.id == signal_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


def compute_catalog_summary(signals: Sequence[Signal]) -> SignalCatalogSummary:
    """
    Calculates summary aggregate counts across catalog records.
    """
    by_category: dict[str, int] = {}
    by_target_entity: dict[str, int] = {}
    by_severity: dict[str, int] = {}

    for s in signals:
        by_category[s.category] = by_category.get(s.category, 0) + 1
        by_target_entity[s.target_entity] = by_target_entity.get(s.target_entity, 0) + 1
        by_severity[s.severity] = by_severity.get(s.severity, 0) + 1

    return SignalCatalogSummary(
        total_signals=len(signals),
        by_category=by_category,
        by_target_entity=by_target_entity,
        by_severity=by_severity,
    )


async def get_catalog_response(
    db: AsyncSession,
    category: SignalCategory | None = None,
    target_entity: SignalTargetEntity | None = None,
    severity: SignalSeverity | None = None,
    active_only: bool = True,
) -> SignalCatalogResponse:
    """
    Builds the complete catalog response with summary statistics.
    """
    # Fetch all active signals for overall summary computation
    all_active_signals = await get_signals_from_db(db, active_only=active_only)
    summary = compute_catalog_summary(all_active_signals)

    # If filters applied, fetch filtered list
    if category or target_entity or severity:
        filtered_signals = await get_signals_from_db(
            db,
            category=category,
            target_entity=target_entity,
            severity=severity,
            active_only=active_only,
        )
        data = [SignalDefinition.model_validate(s) for s in filtered_signals]
    else:
        data = [SignalDefinition.model_validate(s) for s in all_active_signals]

    return SignalCatalogResponse(data=data, summary=summary)
