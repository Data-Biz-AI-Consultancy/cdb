"""
cdb.services.signals.utils.enrichment

Metadata enrichment, company attribute parsing, and person sanitization utilities.
"""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.company import Company
from cdb.models.person import Person


async def enrich_company_context(
    db: AsyncSession,
    company_id: Any | None,
    metadata_payload: dict[str, Any],
) -> dict[str, Any]:
    """
    Attaches rich account supporting context (name, tier, segment, evidence account_name)
    to the signal metadata payload if company_id is present.
    """
    if not company_id:
        return metadata_payload

    company = await db.get(Company, company_id)
    if company:
        metadata_payload.setdefault("company_name", company.name)
        if company.attributes:
            tier = company.attributes.get("tier")
            segment = company.attributes.get("segment")
            if tier:
                metadata_payload.setdefault("company_tier", tier)
            if segment:
                metadata_payload.setdefault("company_segment", segment)
        if "evidence" in metadata_payload and isinstance(metadata_payload["evidence"], dict):
            metadata_payload["evidence"].setdefault("account_name", company.name)

    return metadata_payload


def extract_funding_enrichment(
    attrs: dict[str, Any] | None,
) -> tuple[str, str | None, str | None, str] | None:
    """
    Extracts structured funding round data from Company.attributes.
    Returns: (round_label, amount, date_str, severity) or None
    """
    if not attrs or not isinstance(attrs, dict):
        return None

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
        round_label = str(round_name) if round_name else "Capital Investment"
        severity = (
            "high"
            if any(x in round_label.lower() for x in ["series b", "series c", "series d", "growth"])
            else "medium"
        )
        return (
            round_label,
            str(amount) if amount else None,
            str(date_str) if date_str else None,
            severity,
        )

    return None


def extract_headcount_enrichment(
    attrs: dict[str, Any] | None,
) -> str | None:
    """
    Extracts structured headcount scaling and hiring data from Company.attributes.
    Returns: growth_description string or None
    """
    if not attrs or not isinstance(attrs, dict):
        return None

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
        return (
            f"+{growth_rate}% growth"
            if growth_rate
            else (f"{openings} open positions" if openings else "Aggressive team expansion")
        )

    return None


async def sanitize_target_persons(
    db: AsyncSession,
    person_id: Any | None,
    connected_person_ids: list[Any] | None,
) -> tuple[Any | None, list[Any]]:
    """
    Protects against attributing client signals to internal employees/host.
    Swaps internal person_id with first non-internal connected person and
    returns a deduplicated list of non-internal target person IDs.
    """
    effective_person_id = person_id

    if effective_person_id:
        target_person = await db.get(Person, effective_person_id)
        if target_person and target_person.is_internal:
            replacement_id = None
            for cpid in connected_person_ids or []:
                if cpid != effective_person_id:
                    cp = await db.get(Person, cpid)
                    if cp and not cp.is_internal:
                        replacement_id = cp.id
                        break
            effective_person_id = replacement_id

    clean_target_ids: list[Any] = []
    for pid in connected_person_ids or []:
        if not pid:
            continue
        p_rec = await db.get(Person, pid)
        if p_rec and not p_rec.is_internal:
            if pid not in clean_target_ids:
                clean_target_ids.append(pid)

    if effective_person_id and effective_person_id not in clean_target_ids:
        clean_target_ids.insert(0, effective_person_id)

    return effective_person_id, clean_target_ids
