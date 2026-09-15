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
    assess_confidence,
    build_evidence_payload,
    build_signal_meta,
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
    conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(
        Decimal("0.90") if event_type == "funding" else Decimal("0.85")
    )
    evidence = build_evidence_payload(
        evidence_type="enrichment_data",
        source_entity_type="company",
        source_entity_id=str(comp.id),
        occurred_at=occurred_at,
        days_elapsed=0,
        excerpt=evidence_excerpt,
        key_metrics=key_metrics,
        verification_status="verified",
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
            results.append(res)

    return results
