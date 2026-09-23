"""
cdb.services.signals.detectors.growth.enrichment

Detects funding and hiring growth signals from structured Company.attributes data.
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
from cdb.services.signals.utils import (
    _upsert_detected_signal,
    extract_funding_enrichment,
    extract_headcount_enrichment,
    fetch_active_companies,
)


async def _create_enrichment_signal(
    db: AsyncSession,
    comp: Company,
    event_type: str,
    label: str,
    summary: str,
    evidence_excerpt: str,
    key_metrics: dict[str, Any],
    severity: str = "medium",
    occurred_at: str | None = None,
    **extra_meta: Any,
) -> tuple[DetectedSignal, bool]:
    raw_conf = Decimal("0.90") if event_type == "funding" else Decimal("0.85")

    quality_assessment = evaluate_source_data_quality(
        signal_id="hiring_funding_event",
        days_elapsed=0,
        max_fresh_days=90,
        has_company=bool(comp.id),
        has_contact_role=True,
        raw_excerpt=evidence_excerpt,
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

    if event_type == "funding":
        why_it_matters = (
            f"Fresh capital investment ({label}) accelerates roadmap delivery and tech initiatives at {comp.name}. "
            "High-impact advisory or specialized consulting sprints can immediately relieve technical capacity constraints."
        )
        trigger_title = f"Capital round identified in account profile: {label}"
    else:
        why_it_matters = (
            f"Headcount expansion ({label}) signals strategic scaling at {comp.name}. "
            "Engineering recruitment cycles take 3–6 months; external advisory support offers immediate execution velocity."
        )
        trigger_title = f"Headcount expansion recorded: {label}"

    commercial_ctx = {
        "account_name": comp.name,
        "domain": comp.domain,
        "event_type": event_type,
        "label": label,
        **{k: v for k, v in extra_meta.items() if k in ("round", "amount", "growth_description")},
    }

    evidence_status, evidence_notes = determine_evidence_status(
        days_elapsed=0,
        max_fresh_days=90,
        is_uncertain=is_uncertain,
        verification_status="verified",
    )

    evidence = build_evidence_payload(
        evidence_type="enrichment_data",
        source_entity_type="company",
        source_entity_id=str(comp.id),
        source_display="Structured Account Enrichment Data",
        trigger_event_title=trigger_title,
        why_it_matters_now=why_it_matters,
        occurred_at=occurred_at,
        days_elapsed=0,
        excerpt=quality_assessment.processed_excerpt,
        evidence_status=evidence_status,
        evidence_notes=evidence_notes,
        commercial_context=commercial_ctx,
        key_metrics=key_metrics,
        verification_status="verified",
        source_reliability=quality_assessment.source_reliability.value,
        data_quality_flags=quality_assessment.data_quality_flags,
        disclosure_notes=quality_assessment.disclosure_notes,
        has_quality_warning=quality_assessment.has_quality_warning,
    )
    meta = build_signal_meta(
        conf_score,
        conf_tier,
        is_uncertain,
        uncert_reasons,
        evidence,
        event_type=event_type,
        enrichment_source="company_attributes",
        company_name=comp.name,
        why_it_matters_now=why_it_matters,
        has_data_quality_warning=quality_assessment.has_quality_warning,
        data_quality_flags=quality_assessment.data_quality_flags,
        source_reliability=quality_assessment.source_reliability.value,
        is_suppressed=quality_assessment.is_suppressed,
        **extra_meta,
    )
    return await _upsert_detected_signal(
        db,
        signal_id="hiring_funding_event",
        company_id=comp.id,
        title=f"{'Funding Event' if event_type == 'funding' else 'Hiring Expansion'}: {comp.name} ({label})",
        summary=summary,
        severity=severity,
        score=conf_score,
        metadata_payload=meta,
    )


async def detect_growth_from_enrichment(
    db: AsyncSession,
    now: datetime.datetime,
    seen_companies: set[Any],
) -> list[tuple[DetectedSignal, bool]]:
    """Evaluates structured Company.attributes for funding rounds and headcount scaling."""
    all_companies = await fetch_active_companies(db)
    results: list[tuple[DetectedSignal, bool]] = []

    for comp in all_companies:
        if comp.id in seen_companies or not comp.attributes:
            continue

        # A. Funding rounds
        funding_info = extract_funding_enrichment(comp.attributes)
        if funding_info:
            round_label, amount, date_str, severity = funding_info
            seen_companies.add(comp.id)
            amount_label = f" ({amount})" if amount else ""
            res = await _create_enrichment_signal(
                db,
                comp,
                event_type="funding",
                label=round_label,
                summary=(
                    f"Enrichment data indicates {comp.name} secured {round_label}{amount_label}. "
                    "Fresh investment accelerates tech execution and advisory needs."
                ),
                evidence_excerpt=f"Company enrichment attribute indicates {round_label}{amount_label}",
                key_metrics={
                    "enrichment_source": "company_attributes",
                    "event_type": "funding",
                    "round": round_label,
                    "amount": amount,
                    "account_name": comp.name,
                },
                severity=severity,
                occurred_at=date_str or now.isoformat(),
                round=round_label,
                amount=amount,
            )
            if res and res[0] is not None:
                results.append(res)
            continue

        # B. Headcount expansion
        growth_desc = extract_headcount_enrichment(comp.attributes)
        if growth_desc:
            seen_companies.add(comp.id)
            res = await _create_enrichment_signal(
                db,
                comp,
                event_type="hiring_expansion",
                label=growth_desc,
                summary=(
                    f"Enrichment data indicates {comp.name} is scaling headcount ({growth_desc}). "
                    "Capacity constraints make external advisory and delivery sprint support highly attractive."
                ),
                evidence_excerpt=f"Company enrichment attributes reflect team scaling: {growth_desc}",
                key_metrics={
                    "enrichment_source": "company_attributes",
                    "event_type": "hiring_expansion",
                    "growth_description": growth_desc,
                    "account_name": comp.name,
                },
                occurred_at=now.isoformat(),
                growth_description=growth_desc,
            )
            if res and res[0] is not None:
                results.append(res)

    return results
