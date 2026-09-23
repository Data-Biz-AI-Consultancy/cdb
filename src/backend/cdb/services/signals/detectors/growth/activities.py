"""
cdb.services.signals.detectors.growth.activities

Detects hiring and funding signals from unstructured Activity interaction notes.
"""

import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.company import Company
from cdb.models.signal import DetectedSignal
from cdb.services.signals.classification import (
    SourceReliability,
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
    determine_evidence_status,
    evaluate_source_data_quality,
)
from cdb.services.signals.patterns import FUNDING_REGEX, HIRING_REGEX
from cdb.services.signals.utils import (
    _upsert_detected_signal,
    days_between,
    extract_activity_persons,
    fetch_recent_activities,
    get_activity_searchable_text,
    get_company_display_name,
)


async def detect_growth_from_activities(
    db: AsyncSession,
    now: datetime.datetime,
    cutoff: datetime.datetime,
    seen_companies: set[Any],
) -> list[tuple[DetectedSignal, bool]]:
    """Evaluates unstructured interaction text for funding or hiring keywords."""
    activities = await fetch_recent_activities(db, cutoff, require_company=True)
    results: list[tuple[DetectedSignal, bool]] = []

    for act in activities:
        content = get_activity_searchable_text(act)
        funding_match = FUNDING_REGEX.search(content)
        hiring_match = HIRING_REGEX.search(content)

        if not funding_match and not hiring_match:
            continue

        if act.company_id in seen_companies:
            continue
        seen_companies.add(act.company_id)

        company = await db.get(Company, act.company_id)
        comp_name = get_company_display_name(company)
        event_type = "Funding" if funding_match else "Hiring Expansion"
        matched_phrase = (funding_match or hiring_match).group(0)

        days_ago = days_between(act.occurred_at, now)
        raw_conf = Decimal("0.80") if funding_match else Decimal("0.65")

        quality_assessment = evaluate_source_data_quality(
            signal_id="hiring_funding_event",
            days_elapsed=days_ago,
            max_fresh_days=60,
            has_company=bool(act.company_id),
            has_contact_role=True,
            raw_excerpt=f"Matched '{matched_phrase}' in activity: {act.title or act.summary or ''}",
            confidence_score=raw_conf,
            source_reliability=SourceReliability.MEDIUM,
        )

        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(
            raw_conf,
            quality_flags=quality_assessment.data_quality_flags,
            confidence_penalty=quality_assessment.confidence_penalty,
        )
        for note in quality_assessment.disclosure_notes:
            if note not in uncert_reasons:
                uncert_reasons.append(note)

        why_it_matters = (
            f"Fresh capital investment or rapid hiring expansion ('{matched_phrase}') at {comp_name} "
            "creates urgent execution pressure. Specialized external consulting bridges delivery gaps "
            "while permanent headcount is recruited."
        )
        trigger_title = (
            f"{event_type} indicator identified in {act.type or 'touchpoint'}: '{matched_phrase}'"
        )

        commercial_ctx = {
            "account_name": comp_name,
            "domain": company.domain if company else None,
            "event_type": event_type.lower(),
            "matched_phrase": matched_phrase,
            "activity_title": act.title,
        }

        evidence_status, evidence_notes = determine_evidence_status(
            days_elapsed=days_ago,
            max_fresh_days=60,
            is_uncertain=is_uncertain,
            verification_status="verified" if not is_uncertain else "probable",
        )

        evidence = build_evidence_payload(
            evidence_type="text_pattern",
            source_entity_type="activity",
            source_entity_id=str(act.id),
            source_display=f"Interaction Note: {act.title or act.type or 'Touchpoint'}",
            trigger_event_title=trigger_title,
            why_it_matters_now=why_it_matters,
            occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
            days_elapsed=days_ago,
            excerpt=quality_assessment.processed_excerpt,
            evidence_status=evidence_status,
            evidence_notes=evidence_notes,
            commercial_context=commercial_ctx,
            key_metrics={
                "event_type": event_type.lower(),
                "matched_phrase": matched_phrase,
                "account_name": comp_name,
            },
            verification_status="verified" if not is_uncertain else "probable",
            source_reliability=quality_assessment.source_reliability.value,
            data_quality_flags=quality_assessment.data_quality_flags,
            disclosure_notes=quality_assessment.disclosure_notes,
            has_quality_warning=quality_assessment.has_quality_warning,
        )

        title = f"{event_type} Signal: {comp_name} ('{matched_phrase}')"
        summary = (
            f"Interaction on {act.occurred_at.strftime('%Y-%m-%d')} highlighted a growth/capital event: "
            f"'{matched_phrase}'. Potential advisory or capability acceleration opportunity."
        )

        connected_pids, person_roles, suggested = extract_activity_persons(act)
        meta = build_signal_meta(
            conf_score,
            conf_tier,
            is_uncertain,
            uncert_reasons,
            evidence,
            event_type=event_type.lower(),
            matched_phrase=matched_phrase,
            activity_date=act.occurred_at.isoformat() if act.occurred_at else None,
            company_name=comp_name,
            person_roles=person_roles,
            suggested_persons=suggested,
            why_it_matters_now=why_it_matters,
            has_data_quality_warning=quality_assessment.has_quality_warning,
            data_quality_flags=quality_assessment.data_quality_flags,
            source_reliability=quality_assessment.source_reliability.value,
            is_suppressed=quality_assessment.is_suppressed,
        )

        res = await _upsert_detected_signal(
            db,
            signal_id="hiring_funding_event",
            company_id=act.company_id,
            person_id=act.person_id,
            connected_person_ids=connected_pids,
            activity_id=act.id,
            title=title,
            summary=summary,
            severity="medium",
            score=conf_score,
            metadata_payload=meta,
        )
        if res and res[0] is not None:
            results.append(res)

    return results
