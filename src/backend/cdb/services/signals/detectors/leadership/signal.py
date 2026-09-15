"""
cdb.services.signals.detectors.leadership.signal

Evidence payload assembly and persistence for leadership change signals.
"""

import datetime
from decimal import Decimal
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.company import Company
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import (
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
)
from cdb.services.signals.utils import (
    _upsert_detected_signal,
    get_company_display_name,
    get_person_display_name,
)


async def create_leadership_signal(
    db: AsyncSession,
    rel: PersonCompanyRelationship,
    event_type: Literal["departure", "new_hire"],
    transition_date: datetime.date | None,
    now: datetime.datetime,
) -> tuple[DetectedSignal, bool]:
    person = await db.get(Person, rel.person_id)
    company = await db.get(Company, rel.company_id)
    person_name = get_person_display_name(
        person, default="Contact" if event_type == "departure" else "Leader"
    )
    comp_name = get_company_display_name(
        company, default="Company" if event_type == "departure" else "Target Company"
    )

    conf_val = Decimal("0.85") if transition_date else Decimal("0.65")
    conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(conf_val)
    days_elapsed = (now.date() - transition_date).days if transition_date else None

    if event_type == "departure":
        excerpt = (
            f"{person_name} departed former role '{rel.title or 'Stakeholder'}' at {comp_name}"
        )
        title = f"Leadership Departure: {person_name} left {comp_name}"
        summary = (
            f"{person_name} transitioned away from {comp_name} (former role: {rel.title or 'Stakeholder'}). "
            "Opportunity to congratulate and explore relationships at their new destination."
        )
    else:
        excerpt = f"{person_name} joined {comp_name} as {rel.title}"
        title = f"New Executive Leader: {person_name} ({rel.title}) at {comp_name}"
        summary = (
            f"{person_name} recently joined {comp_name} as {rel.title}. "
            "Fresh leadership mandates often unlock new data, AI, or advisory budgets."
        )

    evidence = build_evidence_payload(
        evidence_type="relationship_transition",
        source_entity_type="relationship",
        source_entity_id=str(rel.id),
        occurred_at=transition_date.isoformat() if transition_date else None,
        days_elapsed=days_elapsed,
        excerpt=excerpt,
        key_metrics={"event_type": event_type, "role": rel.title},
        verification_status="verified" if transition_date else "probable",
    )

    date_key = "ended_at" if event_type == "departure" else "started_at"
    extra_meta = {
        date_key: transition_date.isoformat() if transition_date else None,
        "event_type": event_type,
        "role": rel.title,
        "company_name": comp_name,
        "person_name": person_name,
    }

    meta = build_signal_meta(
        conf_score,
        conf_tier,
        is_uncertain,
        uncert_reasons,
        evidence,
        **extra_meta,
    )

    return await _upsert_detected_signal(
        db,
        signal_id="leadership_change",
        person_id=rel.person_id,
        company_id=rel.company_id,
        title=title,
        summary=summary,
        severity="high",
        score=conf_score,
        metadata_payload=meta,
    )
