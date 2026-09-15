"""
cdb.services.signals.utils.enrichment

Metadata enrichment and person sanitization utilities for signal evaluation.
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
