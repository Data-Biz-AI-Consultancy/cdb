"""
cdb.services.signals.utils.linking

Participant person relationship linking utilities for detected signals.
"""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.signal import DetectedSignalPerson


async def link_signal_persons(
    db: AsyncSession,
    detected_signal_id: Any,
    clean_target_ids: list[Any],
    primary_person_id: Any | None,
    person_roles: dict[str, str],
) -> None:
    """
    Links all connected non-internal persons to the detected signal
    with their designated role ('primary' vs 'participant').
    """
    for pid in clean_target_ids:
        link_stmt = select(DetectedSignalPerson).where(
            DetectedSignalPerson.detected_signal_id == detected_signal_id,
            DetectedSignalPerson.person_id == pid,
        )
        existing_link = (await db.execute(link_stmt)).scalar_one_or_none()
        assigned_role = person_roles.get(str(pid)) or (
            "primary" if pid == primary_person_id else "participant"
        )
        if not existing_link:
            db.add(
                DetectedSignalPerson(
                    detected_signal_id=detected_signal_id,
                    person_id=pid,
                    role=assigned_role,
                )
            )
        elif existing_link.role != assigned_role and assigned_role != "participant":
            existing_link.role = assigned_role
