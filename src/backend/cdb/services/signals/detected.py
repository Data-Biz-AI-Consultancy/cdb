import datetime
import uuid
from collections.abc import Sequence
from decimal import Decimal

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cdb.models.base import utc_now
from cdb.models.person import Person
from cdb.models.signal import DetectedSignal, DetectedSignalPerson, Signal
from cdb.models.user import User
from cdb.schemas.signals import (
    ConnectedPersonResponse,
    DetectedSignalResponse,
    DetectedSignalStatsResponse,
    DetectedSignalStatus,
    DetectedSignalUpdate,
    SignalDefinition,
    SignalSeverity,
    SuggestedPersonResponse,
)


def _to_detected_response(sig: DetectedSignal) -> DetectedSignalResponse:
    """Converts ORM DetectedSignal into rich response model."""
    comp_name = sig.company.name if sig.company else None
    opp_title = sig.opportunity.title if sig.opportunity else None
    eng_title = sig.engagement.title if sig.engagement else None

    connected_persons: list[ConnectedPersonResponse] = []
    connected_person_ids_set: set[uuid.UUID] = set()

    if getattr(sig, "signal_persons", None):
        for sp in sig.signal_persons:
            if sp.person and not sp.person.is_internal:
                p = sp.person
                p_name = f"{p.first_name or ''} {p.last_name or ''}".strip() or "Unnamed Contact"
                connected_persons.append(
                    ConnectedPersonResponse(
                        id=p.id,
                        name=p_name,
                        first_name=p.first_name,
                        last_name=p.last_name,
                        email=p.primary_email,
                        primary_email=p.primary_email,
                        role=sp.role,
                        linkedin_url=p.linkedin_url,
                    )
                )
                connected_person_ids_set.add(p.id)
    elif getattr(sig, "connected_persons", None):
        for cp in sig.connected_persons:
            if not cp.is_internal:
                p_name = f"{cp.first_name or ''} {cp.last_name or ''}".strip() or "Unnamed Contact"
                connected_persons.append(
                    ConnectedPersonResponse(
                        id=cp.id,
                        name=p_name,
                        first_name=cp.first_name,
                        last_name=cp.last_name,
                        email=cp.primary_email,
                        primary_email=cp.primary_email,
                        role="participant",
                        linkedin_url=cp.linkedin_url,
                    )
                )
                connected_person_ids_set.add(cp.id)
    elif sig.person and not sig.person.is_internal:
        p_name = (
            f"{sig.person.first_name or ''} {sig.person.last_name or ''}".strip()
            or "Unnamed Contact"
        )
        connected_persons.append(
            ConnectedPersonResponse(
                id=sig.person.id,
                name=p_name,
                first_name=sig.person.first_name,
                last_name=sig.person.last_name,
                email=sig.person.primary_email,
                primary_email=sig.person.primary_email,
                role="primary",
                linkedin_url=sig.person.linkedin_url,
            )
        )
        connected_person_ids_set.add(sig.person.id)

    if len(connected_persons) > 1:
        person_name = ", ".join(p.name for p in connected_persons)
    elif connected_persons:
        person_name = connected_persons[0].name
    elif sig.person and not sig.person.is_internal:
        person_name = f"{sig.person.first_name or ''} {sig.person.last_name or ''}".strip() or None
    else:
        person_name = None

    primary_person_id = sig.person_id or (connected_persons[0].id if connected_persons else None)

    meta = sig.metadata_payload or {}
    raw_conf = meta.get("confidence_score")
    if raw_conf is not None:
        conf_score = Decimal(str(raw_conf))
    elif sig.score is not None:
        conf_score = Decimal(str(sig.score)) / Decimal("100") if sig.score > 1 else sig.score
    else:
        conf_score = None

    # Parse suggested persons from metadata payload
    suggested_persons: list[SuggestedPersonResponse] = []
    raw_suggested = meta.get("suggested_persons") or []
    for sp_item in raw_suggested:
        sp_id = None
        if sp_item.get("person_id"):
            try:
                sp_id = uuid.UUID(str(sp_item["person_id"]))
            except Exception:
                pass
        # Only suggest if not already connected
        if sp_id and sp_id in connected_person_ids_set:
            continue
        suggested_persons.append(
            SuggestedPersonResponse(
                person_id=sp_id,
                name=sp_item.get("name") or "Candidate Contact",
                first_name=sp_item.get("first_name"),
                role=sp_item.get("role"),
                company_id=uuid.UUID(str(sp_item["company_id"]))
                if sp_item.get("company_id")
                else None,
                company_name=sp_item.get("company_name"),
                confidence=sp_item.get("confidence"),
            )
        )

    return DetectedSignalResponse(
        id=sig.id,
        signal_id=sig.signal_id,
        signal=SignalDefinition.model_validate(sig.signal) if sig.signal else None,
        company_id=sig.company_id,
        company_name=comp_name,
        person_id=primary_person_id,
        person_name=person_name,
        connected_persons=connected_persons,
        suggested_persons=suggested_persons,
        opportunity_id=sig.opportunity_id,
        opportunity_title=opp_title,
        engagement_id=sig.engagement_id,
        engagement_title=eng_title,
        activity_id=sig.activity_id,
        status=DetectedSignalStatus(sig.status),
        severity=SignalSeverity(sig.severity),
        score=sig.score,
        confidence_score=conf_score,
        confidence_tier=meta.get("confidence_tier"),
        is_uncertain=meta.get("is_uncertain", False),
        uncertainty_reasons=meta.get("uncertainty_reasons", []),
        has_conflict=meta.get("has_conflict", False),
        conflicting_signal_ids=meta.get("conflicting_signal_ids", []),
        conflict_summary=meta.get("conflict_summary"),
        evidence=meta.get("evidence"),
        title=sig.title,
        summary=sig.summary,
        metadata_payload=meta,
        actioned_at=sig.actioned_at,
        actioned_by_id=sig.actioned_by_id,
        resolution_notes=sig.resolution_notes,
        detected_at=sig.detected_at,
        expires_at=sig.expires_at,
        created_at=sig.created_at,
        updated_at=sig.updated_at,
    )


async def list_detected_signals(
    db: AsyncSession,
    signal_id: str | None = None,
    category: str | None = None,
    status: DetectedSignalStatus | None = None,
    severity: SignalSeverity | None = None,
    company_id: uuid.UUID | None = None,
    person_id: uuid.UUID | None = None,
    opportunity_id: uuid.UUID | None = None,
    engagement_id: uuid.UUID | None = None,
    is_uncertain: bool | None = None,
    has_conflict: bool | None = None,
    lookback_days: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[DetectedSignalResponse], int]:
    """
    Lists detected signals with multi-dimensional filtering.
    """
    stmt: Select = (
        select(DetectedSignal)
        .options(
            selectinload(DetectedSignal.signal),
            selectinload(DetectedSignal.company),
            selectinload(DetectedSignal.person),
            selectinload(DetectedSignal.opportunity),
            selectinload(DetectedSignal.engagement),
            selectinload(DetectedSignal.signal_persons).selectinload(DetectedSignalPerson.person),
            selectinload(DetectedSignal.connected_persons),
        )
        .order_by(DetectedSignal.detected_at.desc())
    )

    if signal_id:
        stmt = stmt.where(DetectedSignal.signal_id == signal_id)
    if status:
        stmt = stmt.where(DetectedSignal.status == status.value)
    if severity:
        stmt = stmt.where(DetectedSignal.severity == severity.value)
    if company_id:
        stmt = stmt.where(DetectedSignal.company_id == company_id)
    if person_id:
        stmt = stmt.where(DetectedSignal.person_id == person_id)
    if opportunity_id:
        stmt = stmt.where(DetectedSignal.opportunity_id == opportunity_id)
    if engagement_id:
        stmt = stmt.where(DetectedSignal.engagement_id == engagement_id)
    if category:
        stmt = stmt.join(Signal, Signal.id == DetectedSignal.signal_id).where(
            Signal.category == category
        )
    if lookback_days:
        cutoff = utc_now() - datetime.timedelta(days=lookback_days)
        stmt = stmt.where(DetectedSignal.detected_at >= cutoff)

    bind = db.get_bind()
    is_sqlite = getattr(bind.dialect, "name", "") == "sqlite"

    if is_uncertain is not None:
        if is_sqlite:
            target_val = 1 if is_uncertain else 0
            stmt = stmt.where(
                func.json_extract(DetectedSignal.metadata_payload, "$.is_uncertain") == target_val
            )
        else:
            stmt = stmt.where(
                DetectedSignal.metadata_payload["is_uncertain"].as_boolean() == is_uncertain
            )

    if has_conflict is not None:
        if is_sqlite:
            target_val = 1 if has_conflict else 0
            stmt = stmt.where(
                func.json_extract(DetectedSignal.metadata_payload, "$.has_conflict") == target_val
            )
        else:
            stmt = stmt.where(
                DetectedSignal.metadata_payload["has_conflict"].as_boolean() == has_conflict
            )

    # Count total matching records
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.scalar(count_stmt)) or 0

    stmt = stmt.limit(limit).offset(offset)
    records = (await db.execute(stmt)).scalars().all()

    return [_to_detected_response(r) for r in records], total


async def get_detected_signal_stats(
    db: AsyncSession, lookback_days: int | None = None
) -> DetectedSignalStatsResponse:
    """
    Computes summary breakdown metrics across all detected signals.
    Optionally constrained to a lookback window.
    """
    stmt = select(DetectedSignal).options(selectinload(DetectedSignal.signal))
    if lookback_days:
        cutoff = utc_now() - datetime.timedelta(days=lookback_days)
        stmt = stmt.where(DetectedSignal.detected_at >= cutoff)
    records: Sequence[DetectedSignal] = (await db.execute(stmt)).scalars().all()

    by_severity: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_signal: dict[str, int] = {}
    by_status: dict[str, int] = {}
    total_active = 0
    total_conflicting = 0
    total_uncertain = 0

    for r in records:
        by_status[r.status] = by_status.get(r.status, 0) + 1
        if r.status == "active":
            total_active += 1
            meta = r.metadata_payload or {}
            if meta.get("has_conflict"):
                total_conflicting += 1
            if meta.get("is_uncertain"):
                total_uncertain += 1
            by_severity[r.severity] = by_severity.get(r.severity, 0) + 1
            if r.signal:
                by_category[r.signal.category] = by_category.get(r.signal.category, 0) + 1
            by_signal[r.signal_id] = by_signal.get(r.signal_id, 0) + 1

    return DetectedSignalStatsResponse(
        total_active=total_active,
        total_conflicting=total_conflicting,
        total_uncertain=total_uncertain,
        by_severity=by_severity,
        by_category=by_category,
        by_signal=by_signal,
        by_status=by_status,
    )


async def get_detected_signal(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
) -> DetectedSignalResponse | None:
    """
    Retrieves a single detected signal by ID with eager-loaded relations.
    """
    stmt = (
        select(DetectedSignal)
        .where(DetectedSignal.id == signal_instance_id)
        .options(
            selectinload(DetectedSignal.signal),
            selectinload(DetectedSignal.company),
            selectinload(DetectedSignal.person),
            selectinload(DetectedSignal.opportunity),
            selectinload(DetectedSignal.engagement),
            selectinload(DetectedSignal.signal_persons).selectinload(DetectedSignalPerson.person),
            selectinload(DetectedSignal.connected_persons),
        )
    )
    sig = (await db.execute(stmt)).scalar_one_or_none()
    if not sig:
        return None
    return _to_detected_response(sig)


async def update_detected_signal(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
    payload: DetectedSignalUpdate,
    user: User | None = None,
) -> DetectedSignalResponse | None:
    """
    Updates status and resolution details of a detected signal.
    """
    stmt = (
        select(DetectedSignal)
        .where(DetectedSignal.id == signal_instance_id)
        .options(
            selectinload(DetectedSignal.signal),
            selectinload(DetectedSignal.company),
            selectinload(DetectedSignal.person),
            selectinload(DetectedSignal.opportunity),
            selectinload(DetectedSignal.engagement),
            selectinload(DetectedSignal.signal_persons).selectinload(DetectedSignalPerson.person),
            selectinload(DetectedSignal.connected_persons),
        )
    )
    sig = (await db.execute(stmt)).scalar_one_or_none()
    if not sig:
        return None

    now = utc_now()
    sig.status = payload.status.value
    if payload.resolution_notes is not None:
        sig.resolution_notes = payload.resolution_notes

    if payload.status in [
        DetectedSignalStatus.ACTIONED,
        DetectedSignalStatus.DISMISSED,
        DetectedSignalStatus.RESOLVED,
    ]:
        sig.actioned_at = now
        if user:
            sig.actioned_by_id = user.id

    sig.updated_at = now
    await db.commit()
    await db.refresh(sig)
    return _to_detected_response(sig)


async def link_person_to_detected_signal(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
    person_id: uuid.UUID,
    role: str = "counterparty",
) -> DetectedSignalResponse | None:
    """
    Links a person to a detected signal with a specific role.
    """
    sig = await db.get(DetectedSignal, signal_instance_id)
    if not sig:
        return None

    person = await db.get(Person, person_id)
    if not person:
        return None

    link_stmt = select(DetectedSignalPerson).where(
        DetectedSignalPerson.detected_signal_id == signal_instance_id,
        DetectedSignalPerson.person_id == person_id,
    )
    existing_link = (await db.execute(link_stmt)).scalar_one_or_none()
    if not existing_link:
        db.add(
            DetectedSignalPerson(
                detected_signal_id=signal_instance_id,
                person_id=person_id,
                role=role,
            )
        )
    else:
        existing_link.role = role

    # If the signal currently has no person_id and person is not internal, set as person_id
    if not sig.person_id and not person.is_internal:
        sig.person_id = person_id

    # Update metadata person_roles
    meta = dict(sig.metadata_payload or {})
    roles = dict(meta.get("person_roles") or {})
    roles[str(person_id)] = role
    meta["person_roles"] = roles
    sig.metadata_payload = meta
    sig.updated_at = utc_now()

    await db.commit()
    db.expire_all()
    return await get_detected_signal(db, signal_instance_id)


async def unlink_person_from_detected_signal(
    db: AsyncSession,
    signal_instance_id: uuid.UUID,
    person_id: uuid.UUID,
) -> DetectedSignalResponse | None:
    """
    Unlinks a person from a detected signal.
    """
    sig = await db.get(DetectedSignal, signal_instance_id)
    if not sig:
        return None

    link_stmt = select(DetectedSignalPerson).where(
        DetectedSignalPerson.detected_signal_id == signal_instance_id,
        DetectedSignalPerson.person_id == person_id,
    )
    existing_link = (await db.execute(link_stmt)).scalar_one_or_none()
    if existing_link:
        await db.delete(existing_link)

    # If primary person_id was this person, clear or fallback to next connected person
    if sig.person_id == person_id:
        remaining_stmt = (
            select(DetectedSignalPerson)
            .where(
                DetectedSignalPerson.detected_signal_id == signal_instance_id,
                DetectedSignalPerson.person_id != person_id,
            )
            .limit(1)
        )
        remaining = (await db.execute(remaining_stmt)).scalar_one_or_none()
        sig.person_id = remaining.person_id if remaining else None

    # Update metadata person_roles
    meta = dict(sig.metadata_payload or {})
    roles = dict(meta.get("person_roles") or {})
    roles.pop(str(person_id), None)
    meta["person_roles"] = roles
    sig.metadata_payload = meta
    sig.updated_at = utc_now()

    await db.commit()
    db.expire_all()
    return await get_detected_signal(db, signal_instance_id)
