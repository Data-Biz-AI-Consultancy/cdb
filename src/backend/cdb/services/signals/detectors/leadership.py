"""
cdb.services.signals.detectors.leadership

Detects executive departures and new executive arrivals within the lookback
window, using title matching against EXECUTIVE_TITLE_REGEX.
"""

import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.company import Company
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.signal import DetectedSignal
from cdb.services.signals._helpers import _upsert_detected_signal
from cdb.services.signals.classification import assess_confidence, build_evidence_payload
from cdb.services.signals.patterns import EXCLUDE_EXECUTIVE_TITLE_REGEX, EXECUTIVE_TITLE_REGEX


async def detect_leadership_changes(
    db: AsyncSession, now: datetime.datetime, lookback_days: int = 90
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects executive departures or new executive roles within the lookback window.
    """
    cutoff_date = (now - datetime.timedelta(days=lookback_days)).date()

    # 1. Departures (ended_at >= cutoff_date or is_current=False with ended_at)
    dep_stmt = (
        select(PersonCompanyRelationship)
        .where(
            PersonCompanyRelationship.is_current.is_(False),
            PersonCompanyRelationship.ended_at >= cutoff_date,
        )
        .order_by(PersonCompanyRelationship.ended_at.desc())
    )
    departures = (await db.execute(dep_stmt)).scalars().all()

    results: list[tuple[DetectedSignal, bool]] = []
    for rel in departures:
        person = await db.get(Person, rel.person_id)
        company = await db.get(Company, rel.company_id)
        person_name = f"{person.first_name} {person.last_name}" if person else "Contact"
        comp_name = company.name if company else "Company"

        conf_val = Decimal("0.85") if rel.ended_at else Decimal("0.65")
        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(conf_val)

        evidence = build_evidence_payload(
            evidence_type="relationship_transition",
            source_entity_type="relationship",
            source_entity_id=str(rel.id),
            occurred_at=rel.ended_at.isoformat() if rel.ended_at else None,
            days_elapsed=(now.date() - rel.ended_at).days if rel.ended_at else None,
            excerpt=f"{person_name} departed former role '{rel.title or 'Stakeholder'}' at {comp_name}",
            key_metrics={"event_type": "departure", "role": rel.title},
            verification_status="verified" if rel.ended_at else "probable",
        )

        title = f"Leadership Departure: {person_name} left {comp_name}"
        summary = (
            f"{person_name} transitioned away from {comp_name} (former role: {rel.title or 'Stakeholder'}). "
            "Opportunity to congratulate and explore relationships at their new destination."
        )

        meta = {
            "event_type": "departure",
            "role": rel.title,
            "ended_at": rel.ended_at.isoformat() if rel.ended_at else None,
            "company_name": comp_name,
            "person_name": person_name,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
        }

        res = await _upsert_detected_signal(
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
        results.append(res)

    # 2. New Executive arrivals (started_at >= cutoff_date, title matching executive regex)
    arr_stmt = (
        select(PersonCompanyRelationship)
        .where(
            PersonCompanyRelationship.is_current.is_(True),
            PersonCompanyRelationship.started_at >= cutoff_date,
        )
        .order_by(PersonCompanyRelationship.started_at.desc())
    )
    arrivals = (await db.execute(arr_stmt)).scalars().all()

    for rel in arrivals:
        if not rel.title or not EXECUTIVE_TITLE_REGEX.search(rel.title):
            continue
        if EXCLUDE_EXECUTIVE_TITLE_REGEX.search(rel.title):
            continue

        person = await db.get(Person, rel.person_id)
        company = await db.get(Company, rel.company_id)
        person_name = f"{person.first_name} {person.last_name}" if person else "Leader"
        comp_name = company.name if company else "Target Company"

        conf_val = Decimal("0.85") if rel.started_at else Decimal("0.65")
        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(conf_val)

        evidence = build_evidence_payload(
            evidence_type="relationship_transition",
            source_entity_type="relationship",
            source_entity_id=str(rel.id),
            occurred_at=rel.started_at.isoformat() if rel.started_at else None,
            days_elapsed=(now.date() - rel.started_at).days if rel.started_at else None,
            excerpt=f"{person_name} joined {comp_name} as {rel.title}",
            key_metrics={"event_type": "new_hire", "role": rel.title},
            verification_status="verified" if rel.started_at else "probable",
        )

        title = f"New Executive Leader: {person_name} ({rel.title}) at {comp_name}"
        summary = (
            f"{person_name} recently joined {comp_name} as {rel.title}. "
            "Fresh leadership mandates often unlock new data, AI, or advisory budgets."
        )

        meta = {
            "event_type": "new_hire",
            "role": rel.title,
            "started_at": rel.started_at.isoformat() if rel.started_at else None,
            "company_name": comp_name,
            "person_name": person_name,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
        }

        res = await _upsert_detected_signal(
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
        results.append(res)

    return results
