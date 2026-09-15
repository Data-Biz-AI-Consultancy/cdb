"""
cdb.services.signals.detectors.growth

Detects hiring expansion and funding round signals from two sources:
1. Activity text patterns (FUNDING_REGEX / HIRING_REGEX matches in interaction notes).
2. Structured Company.attributes enrichment data (funding_round, headcount fields).
"""

import datetime
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.person import Person
from cdb.models.signal import DetectedSignal
from cdb.services.signals._helpers import _upsert_detected_signal
from cdb.services.signals.classification import assess_confidence, build_evidence_payload
from cdb.services.signals.patterns import FUNDING_REGEX, HIRING_REGEX


async def detect_hiring_funding_events(
    db: AsyncSession, now: datetime.datetime, lookback_days: int = 90
) -> list[tuple[DetectedSignal, bool]]:
    """
    Detects mentions of funding rounds or hiring acceleration across:
    1. Unstructured interactions and meeting debriefs (Activity records within lookback window).
    2. Structured account enrichment data (Company.attributes funding and headcount signals).
    """
    cutoff = now - datetime.timedelta(days=lookback_days)

    results: list[tuple[DetectedSignal, bool]] = []
    seen_companies: set[Any] = set()

    # ── 1. Activity Data Evaluation (Text Patterns) ───────────────────────────

    stmt = (
        select(Activity)
        .where(
            Activity.occurred_at >= cutoff,
            Activity.company_id.is_not(None),
        )
        .order_by(Activity.occurred_at.desc())
    )
    activities = (await db.execute(stmt)).scalars().all()

    for act in activities:
        content = f"{act.title or ''} {act.summary or ''} {act.raw_content or ''}"
        funding_match = FUNDING_REGEX.search(content)
        hiring_match = HIRING_REGEX.search(content)

        if not funding_match and not hiring_match:
            continue

        if act.company_id in seen_companies:
            continue
        seen_companies.add(act.company_id)

        company = await db.get(Company, act.company_id)
        comp_name = company.name if company else "Company"

        event_type = "Funding" if funding_match else "Hiring Expansion"
        matched_phrase = (funding_match or hiring_match).group(0)

        # Confidence assessment based on phrase type and recency
        act_dt = (
            act.occurred_at
            if act.occurred_at.tzinfo
            else act.occurred_at.replace(tzinfo=datetime.UTC)
        )
        days_ago = (now - act_dt).days
        conf_val = Decimal("0.80") if funding_match else Decimal("0.65")
        flags: list[str] = []
        if days_ago > 60:
            conf_val -= Decimal("0.20")
            flags.append(f"Event occurred {days_ago} days ago; growth context may have evolved")

        conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(
            conf_val, ambiguity_flags=flags
        )

        evidence = build_evidence_payload(
            evidence_type="text_pattern",
            source_entity_type="activity",
            source_entity_id=str(act.id),
            occurred_at=act.occurred_at.isoformat() if act.occurred_at else None,
            days_elapsed=days_ago,
            excerpt=f"Matched '{matched_phrase}' in activity: {act.title or act.summary or ''}",
            key_metrics={
                "event_type": event_type.lower(),
                "matched_phrase": matched_phrase,
                "account_name": comp_name,
            },
            verification_status="verified" if not is_uncertain else "probable",
        )

        title = f"{event_type} Signal: {comp_name} ('{matched_phrase}')"
        summary = (
            f"Interaction on {act.occurred_at.strftime('%Y-%m-%d')} highlighted a growth/capital event: "
            f"'{matched_phrase}'. Potential advisory or capability acceleration opportunity."
        )

        # Extract connected persons, roles, and suggested persons from activity
        connected_pids: list[Any] = []
        person_roles: dict[str, str] = {}
        act_attrs = act.attributes or {}
        act_entities = act_attrs.get("entities", [])
        act_suggested = act_attrs.get("suggested_persons", [])

        for e in act_entities:
            epid = e.get("person_id")
            erole = e.get("role") or "counterparty"
            if epid and not e.get("is_internal"):
                try:
                    uuid_val = uuid.UUID(epid) if isinstance(epid, str) else epid
                    if uuid_val not in connected_pids:
                        connected_pids.append(uuid_val)
                    person_roles[str(uuid_val)] = erole
                except Exception:
                    pass

        if act.person_id and act.person_id not in connected_pids:
            p_obj = await db.get(Person, act.person_id)
            if p_obj and not p_obj.is_internal:
                connected_pids.insert(0, act.person_id)

        meta = {
            "event_type": event_type.lower(),
            "matched_phrase": matched_phrase,
            "activity_date": act.occurred_at.isoformat() if act.occurred_at else None,
            "company_name": comp_name,
            "confidence_score": float(conf_score),
            "confidence_tier": conf_tier.value,
            "is_uncertain": is_uncertain,
            "uncertainty_reasons": uncert_reasons,
            "evidence": evidence,
            "person_roles": person_roles,
            "suggested_persons": act_suggested,
        }

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
        results.append(res)

    # ── 2. Enrichment Data Evaluation (Company.attributes) ────────────────────

    companies_stmt = select(Company).where(Company.deleted_at.is_(None))
    all_companies = (await db.execute(companies_stmt)).scalars().all()

    for comp in all_companies:
        if comp.id in seen_companies or not comp.attributes:
            continue

        attrs = comp.attributes

        # A. Funding enrichment signals
        funding_data = (
            attrs.get("funding") or attrs.get("funding_round") or attrs.get("recent_funding_round")
        )
        stage_data = attrs.get("funding_stage") or attrs.get("stage")
        total_funding = attrs.get("total_funding") or attrs.get("total_raised")

        round_name = None
        amount = None
        date_str = None

        if isinstance(funding_data, dict):
            round_name = (
                funding_data.get("round") or funding_data.get("stage") or funding_data.get("name")
            )
            amount = funding_data.get("amount") or funding_data.get("total_raised")
            date_str = funding_data.get("announced_date") or funding_data.get("date")
        elif isinstance(funding_data, str) and funding_data:
            round_name = funding_data
        elif stage_data:
            round_name = str(stage_data)

        if total_funding and not amount:
            amount = str(total_funding)

        if round_name or (amount and "seed" in str(amount).lower()):
            seen_companies.add(comp.id)
            round_label = round_name or "Capital Investment"
            amount_label = f" ({amount})" if amount else ""
            severity = (
                "high"
                if any(
                    x in str(round_label).lower()
                    for x in ["series b", "series c", "series d", "growth"]
                )
                else "medium"
            )

            conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(Decimal("0.90"))

            evidence = build_evidence_payload(
                evidence_type="enrichment_data",
                source_entity_type="company",
                source_entity_id=str(comp.id),
                occurred_at=date_str or now.isoformat(),
                days_elapsed=0,
                excerpt=f"Company enrichment attribute indicates {round_label}{amount_label}",
                key_metrics={
                    "enrichment_source": "company_attributes",
                    "event_type": "funding",
                    "round": round_label,
                    "amount": amount,
                    "account_name": comp.name,
                },
                verification_status="verified",
            )

            title = f"Funding Event: {comp.name} ({round_label})"
            summary = (
                f"Enrichment data indicates {comp.name} secured {round_label}{amount_label}. "
                "Fresh investment accelerates tech execution and advisory needs."
            )

            meta = {
                "event_type": "funding",
                "round": round_label,
                "amount": amount,
                "enrichment_source": "company_attributes",
                "company_name": comp.name,
                "confidence_score": float(conf_score),
                "confidence_tier": conf_tier.value,
                "is_uncertain": is_uncertain,
                "uncertainty_reasons": uncert_reasons,
                "evidence": evidence,
            }

            res = await _upsert_detected_signal(
                db,
                signal_id="hiring_funding_event",
                company_id=comp.id,
                title=title,
                summary=summary,
                severity=severity,
                score=conf_score,
                metadata_payload=meta,
            )
            results.append(res)
            continue

        # B. Headcount expansion & hiring enrichment signals
        headcount_data = (
            attrs.get("headcount") or attrs.get("headcount_growth") or attrs.get("hiring_signals")
        )
        growth_rate = None
        openings = None

        if isinstance(headcount_data, dict):
            growth_rate = (
                headcount_data.get("growth_rate_pct")
                or headcount_data.get("growth_pct")
                or headcount_data.get("growth_rate")
            )
            openings = (
                headcount_data.get("open_roles")
                or headcount_data.get("engineering_openings")
                or headcount_data.get("openings")
            )
        elif isinstance(headcount_data, (int, float)):
            growth_rate = headcount_data
        elif isinstance(headcount_data, str) and "%" in headcount_data:
            growth_rate = headcount_data

        if growth_rate or openings or attrs.get("is_hiring_data"):
            seen_companies.add(comp.id)
            growth_desc = (
                f"+{growth_rate}% growth"
                if growth_rate
                else (f"{openings} open positions" if openings else "Aggressive team expansion")
            )
            conf_score, conf_tier, is_uncertain, uncert_reasons = assess_confidence(Decimal("0.85"))

            evidence = build_evidence_payload(
                evidence_type="enrichment_data",
                source_entity_type="company",
                source_entity_id=str(comp.id),
                occurred_at=now.isoformat(),
                days_elapsed=0,
                excerpt=f"Company enrichment attributes reflect team scaling: {growth_desc}",
                key_metrics={
                    "enrichment_source": "company_attributes",
                    "event_type": "hiring_expansion",
                    "growth_description": growth_desc,
                    "account_name": comp.name,
                },
                verification_status="verified",
            )

            title = f"Hiring Expansion: {comp.name} ({growth_desc})"
            summary = (
                f"Enrichment data indicates {comp.name} is scaling headcount ({growth_desc}). "
                "Capacity constraints make external advisory and delivery sprint support highly attractive."
            )

            meta = {
                "event_type": "hiring_expansion",
                "growth_description": growth_desc,
                "enrichment_source": "company_attributes",
                "company_name": comp.name,
                "confidence_score": float(conf_score),
                "confidence_tier": conf_tier.value,
                "is_uncertain": is_uncertain,
                "uncertainty_reasons": uncert_reasons,
                "evidence": evidence,
            }

            res = await _upsert_detected_signal(
                db,
                signal_id="hiring_funding_event",
                company_id=comp.id,
                title=title,
                summary=summary,
                severity="medium",
                score=conf_score,
                metadata_payload=meta,
            )
            results.append(res)

    return results
