"""
cdb.services.signals.detected.linking

Participant person linking and unlinking operations for detected signals.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.base import utc_now
from cdb.models.person import Person
from cdb.models.signal import DetectedSignal, DetectedSignalPerson
from cdb.schemas.signals import DetectedSignalResponse
from cdb.services.signals.detected.query import get_detected_signal


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


__all__ = [
    "link_person_to_detected_signal",
    "unlink_person_from_detected_signal",
]
