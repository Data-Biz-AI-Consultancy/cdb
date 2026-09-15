"""
cdb.services.signals._helpers

Private shared database helpers used by every signal detector:
- _resolve_account_for_signal: traverses entity relationships to find the affected Company ID.
- _upsert_detected_signal:     inserts or refreshes a DetectedSignal row, linking persons.

These are intentionally private (underscore prefix) — they are implementation
details of the detector layer and should not be called from API routes directly.
"""

import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.base import utc_now
from cdb.models.company import Company
from cdb.models.engagement import Engagement
from cdb.models.opportunity import OpportunityCompany
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship
from cdb.models.signal import DetectedSignal, DetectedSignalPerson


async def _resolve_account_for_signal(
    db: AsyncSession,
    company_id: Any | None = None,
    person_id: Any | None = None,
    opportunity_id: Any | None = None,
    engagement_id: Any | None = None,
    activity_id: Any | None = None,
) -> Any | None:
    """
    Resolves the affected account (Company ID) for any detected signal,
    guaranteeing account attribution by traversing relationships.
    """
    if company_id:
        return company_id

    if engagement_id:
        eng = await db.get(Engagement, engagement_id)
        if eng and eng.company_id:
            return eng.company_id
        if eng and eng.opportunity_id:
            opp_comp_stmt = (
                select(OpportunityCompany.company_id)
                .where(OpportunityCompany.opportunity_id == eng.opportunity_id)
                .limit(1)
            )
            c_id = (await db.execute(opp_comp_stmt)).scalars().first()
            if c_id:
                return c_id

    if opportunity_id:
        opp_comp_stmt = (
            select(OpportunityCompany.company_id)
            .where(OpportunityCompany.opportunity_id == opportunity_id)
            .limit(1)
        )
        c_id = (await db.execute(opp_comp_stmt)).scalars().first()
        if c_id:
            return c_id

    if activity_id:
        act = await db.get(Activity, activity_id)
        if act:
            if act.company_id:
                return act.company_id
            if act.engagement_id:
                eng = await db.get(Engagement, act.engagement_id)
                if eng and eng.company_id:
                    return eng.company_id
            if act.person_id and not person_id:
                person_id = act.person_id

    if person_id:
        # Check active current employment first
        rel_stmt = (
            select(PersonCompanyRelationship)
            .where(
                PersonCompanyRelationship.person_id == person_id,
                PersonCompanyRelationship.is_current.is_(True),
            )
            .order_by(PersonCompanyRelationship.started_at.desc().nullslast())
            .limit(1)
        )
        rel = (await db.execute(rel_stmt)).scalars().first()
        if rel and rel.company_id:
            return rel.company_id

        # Fallback to any past relationship
        past_rel_stmt = (
            select(PersonCompanyRelationship)
            .where(PersonCompanyRelationship.person_id == person_id)
            .order_by(PersonCompanyRelationship.ended_at.desc().nullslast())
            .limit(1)
        )
        past_rel = (await db.execute(past_rel_stmt)).scalars().first()
        if past_rel and past_rel.company_id:
            return past_rel.company_id

    return None


async def _upsert_detected_signal(
    db: AsyncSession,
    signal_id: str,
    title: str,
    severity: str,
    summary: str | None = None,
    company_id: Any | None = None,
    person_id: Any | None = None,
    connected_person_ids: list[Any] | None = None,
    opportunity_id: Any | None = None,
    engagement_id: Any | None = None,
    activity_id: Any | None = None,
    score: Decimal | None = None,
    metadata_payload: dict[str, Any] | None = None,
    expires_at: datetime.datetime | None = None,
) -> tuple[DetectedSignal, bool]:
    """
    Inserts a new detected signal or updates an existing active/acknowledged signal
    for the exact target entity to avoid spamming duplicates.
    Guarantees account resolution by populating company_id and company context.
    Returns (signal_instance, is_new).
    """
    metadata_payload = metadata_payload or {}

    # Guarantee affected account attribution
    if not company_id:
        company_id = await _resolve_account_for_signal(
            db,
            company_id=company_id,
            person_id=person_id,
            opportunity_id=opportunity_id,
            engagement_id=engagement_id,
            activity_id=activity_id,
        )

    # Attach rich account supporting context if company_id is present
    if company_id:
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

    # Protect against attributing client signals to internal employees/host
    person_roles: dict[str, str] = dict(metadata_payload.get("person_roles") or {})
    if person_id:
        target_person = await db.get(Person, person_id)
        if target_person and target_person.is_internal:
            # Swap with first non-internal connected person if available
            replacement_id = None
            for cpid in connected_person_ids or []:
                if cpid != person_id:
                    cp = await db.get(Person, cpid)
                    if cp and not cp.is_internal:
                        replacement_id = cp.id
                        break
            person_id = replacement_id

    # Filter internal employees out of primary target_person_ids for client opportunity/risk signals
    clean_target_ids: list[Any] = []
    for pid in connected_person_ids or []:
        if not pid:
            continue
        p_rec = await db.get(Person, pid)
        if p_rec and not p_rec.is_internal:
            if pid not in clean_target_ids:
                clean_target_ids.append(pid)

    if person_id and person_id not in clean_target_ids:
        clean_target_ids.insert(0, person_id)

    stmt = select(DetectedSignal).where(
        DetectedSignal.signal_id == signal_id,
        DetectedSignal.status.in_(["active", "acknowledged"]),
    )

    if person_id and signal_id in ("unanswered_conversation", "leadership_change"):
        stmt = stmt.where(DetectedSignal.person_id == person_id)
        if company_id:
            stmt = stmt.where(
                or_(DetectedSignal.company_id == company_id, DetectedSignal.company_id.is_(None))
            )
    elif engagement_id:
        stmt = stmt.where(DetectedSignal.engagement_id == engagement_id)
    elif opportunity_id:
        stmt = stmt.where(DetectedSignal.opportunity_id == opportunity_id)
    elif company_id:
        stmt = stmt.where(DetectedSignal.company_id == company_id)
    elif activity_id:
        stmt = stmt.where(DetectedSignal.activity_id == activity_id)
    elif person_id:
        stmt = stmt.where(DetectedSignal.person_id == person_id)

    existing = (await db.execute(stmt)).scalars().first()
    now = utc_now()

    if existing:
        existing.title = title
        existing.summary = summary
        existing.severity = severity
        existing.score = score or existing.score
        existing.company_id = company_id or existing.company_id
        # If person_id was resolved to None (e.g. internal host filtered out and no external
        # counterparty), clear stale person_id rather than retaining legacy internal employee id.
        existing.person_id = person_id
        existing.opportunity_id = opportunity_id or existing.opportunity_id
        existing.engagement_id = engagement_id or existing.engagement_id
        existing.metadata_payload = metadata_payload or {}
        existing.activity_id = activity_id or existing.activity_id
        existing.detected_at = now
        existing.updated_at = now
        if expires_at:
            existing.expires_at = expires_at
        target_sig = existing
        is_new = False
    else:
        new_sig = DetectedSignal(
            signal_id=signal_id,
            company_id=company_id,
            person_id=person_id,
            opportunity_id=opportunity_id,
            engagement_id=engagement_id,
            activity_id=activity_id,
            status="active",
            severity=severity,
            score=score,
            title=title,
            summary=summary,
            metadata_payload=metadata_payload or {},
            detected_at=now,
            expires_at=expires_at,
        )
        db.add(new_sig)
        await db.flush()
        target_sig = new_sig
        is_new = True

    # Link all connected non-internal persons
    for pid in clean_target_ids:
        link_stmt = select(DetectedSignalPerson).where(
            DetectedSignalPerson.detected_signal_id == target_sig.id,
            DetectedSignalPerson.person_id == pid,
        )
        existing_link = (await db.execute(link_stmt)).scalar_one_or_none()
        assigned_role = person_roles.get(str(pid)) or (
            "primary" if pid == person_id else "participant"
        )
        if not existing_link:
            db.add(
                DetectedSignalPerson(
                    detected_signal_id=target_sig.id,
                    person_id=pid,
                    role=assigned_role,
                )
            )
        elif existing_link.role != assigned_role and assigned_role != "participant":
            existing_link.role = assigned_role

    return target_sig, is_new
