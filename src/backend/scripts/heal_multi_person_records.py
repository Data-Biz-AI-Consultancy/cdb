"""
Heals Frankenstein multi-person records created during legacy ingestion.
Reallocates activities, leads, and signals to the real natural persons,
links all involved natural persons to detected_signal_persons,
and safely deletes the merged Frankenstein records.
"""

import asyncio
import logging
from uuid import UUID

from sqlalchemy import delete, select

from cdb.core.database import AsyncSessionLocal
from cdb.models.activity import Activity
from cdb.models.intake import IntakeLinkedInMessage
from cdb.models.lead import Lead
from cdb.models.person import Person
from cdb.models.person_history import PersonHistory
from cdb.models.signal import DetectedSignal, DetectedSignalPerson

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("heal-multi-person")

# Real natural persons
LOUIS_GUITTON_ID = UUID("082fbb5d-458c-4236-acfa-1ff25e218412")
JODI_BARROW_ID = UUID("f0cd9f20-7aa4-4fad-bf88-75e3a64dab54")
FRANKENSTEIN_LOUIS_JODI_ID = UUID("b265fab3-66ec-4910-9616-b47fba24a290")

BRUNO_KANASHIRO_ID = UUID("e1a35704-2cee-4d32-9ae0-e66b9176ac02")
GALIH_RAMADHANI_ID = UUID("a35d9255-6f1b-4245-9c5a-48e311c9626b")
VAN_LE_ID = UUID("7c1e29a1-46b4-4ef7-8195-ded3a97879c3")
ANELIA_SPASOVA_ID = UUID("d74d1008-ac7d-4a2f-81e7-454f09279c1c")
FRANKENSTEIN_BRUNO_GROUP_ID = UUID("26bf1e92-4e36-4e27-83a0-b26d47b93266")


async def heal_louis_and_jodi(db) -> None:
    logger.info("Healing Louis Guitton & Jodi Barrow records...")
    frankenstein = await db.get(Person, FRANKENSTEIN_LOUIS_JODI_ID)
    if not frankenstein:
        logger.info("Frankenstein Louis/Jodi record already removed.")
        return

    louis = await db.get(Person, LOUIS_GUITTON_ID)
    jodi = await db.get(Person, JODI_BARROW_ID)
    assert louis and jodi, "Natural persons Louis and Jodi must exist"

    # 1. Activities
    act_res = await db.execute(
        select(Activity).where(Activity.person_id == FRANKENSTEIN_LOUIS_JODI_ID)
    )
    for act in act_res.scalars().all():
        title = act.title or ""
        attrs = dict(act.attributes or {})
        if "Louis Guitton,Jodi Barrow" in title:
            act.person_id = LOUIS_GUITTON_ID
            attrs["participant_person_ids"] = [str(LOUIS_GUITTON_ID), str(JODI_BARROW_ID)]
            logger.info("Reassigned group activity %s to Louis (with Jodi as participant)", act.id)
        elif "Louis Guitton" in title:
            act.person_id = LOUIS_GUITTON_ID
            logger.info("Reassigned 1-on-1 activity %s to Louis Guitton", act.id)
        elif "Jodi Barrow" in title:
            act.person_id = JODI_BARROW_ID
            logger.info("Reassigned 1-on-1 activity %s to Jodi Barrow", act.id)
        act.attributes = attrs

    # 2. Leads
    lead_res = await db.execute(select(Lead).where(Lead.person_id == FRANKENSTEIN_LOUIS_JODI_ID))
    for lead in lead_res.scalars().all():
        ref = lead.source_ref_id or ""
        if "OGQ3ZTgyYTktMWExOC00ZTg2LTliYjItNjUwM2I3MTFjMGI1" in ref:  # Louis 33 msgs
            lead.person_id = LOUIS_GUITTON_ID
        elif "YzgwMzc0ZjItZWVhYS00M2VlLTliMzgtMTg0Zjk1ZDBlNzg2" in ref:  # Jodi 5 msgs
            lead.person_id = JODI_BARROW_ID
        elif "ZTQ1ZmNkZDgtNjRhZi01Y2U5LThhYWMtYzNmN2E1NmJjZDMz" in ref:  # Jodi 11 msgs
            lead.person_id = JODI_BARROW_ID
        else:
            lead.person_id = LOUIS_GUITTON_ID
        logger.info("Reassigned lead %s to person %s", lead.id, lead.person_id)

    # 3. Detected Signals
    sig_res = await db.execute(
        select(DetectedSignal).where(DetectedSignal.person_id == FRANKENSTEIN_LOUIS_JODI_ID)
    )
    for sig in sig_res.scalars().all():
        if sig.id == UUID("f410fa5d-85f1-460f-9755-d1048f044eb4"):
            # Unanswered conversation with Jodi Barrow
            sig.person_id = JODI_BARROW_ID
            sig.title = sig.title.replace("Louis Guitton,Jodi Barrow", "Jodi Barrow")
            # Connect Jodi
            await _ensure_signal_person(db, sig.id, JODI_BARROW_ID, "primary")
        else:
            # Competitor signal (1997c19d or ab73e293)
            sig.person_id = LOUIS_GUITTON_ID
            # Connect BOTH Louis Guitton and Jodi Barrow!
            await _ensure_signal_person(db, sig.id, LOUIS_GUITTON_ID, "primary")
            await _ensure_signal_person(db, sig.id, JODI_BARROW_ID, "counterparty")
        logger.info("Reassigned signal %s to natural persons", sig.id)

    # 4. Intake LinkedIn Messages
    intake_res = await db.execute(
        select(IntakeLinkedInMessage).where(
            IntakeLinkedInMessage.resolved_person_id == FRANKENSTEIN_LOUIS_JODI_ID
        )
    )
    for m in intake_res.scalars().all():
        if m.participant_names == "Louis Guitton":
            m.resolved_person_id = LOUIS_GUITTON_ID
        elif m.participant_names == "Jodi Barrow":
            m.resolved_person_id = JODI_BARROW_ID
        else:
            m.resolved_person_id = LOUIS_GUITTON_ID

    # 5. Delete PersonHistory and Frankenstein Person
    await db.execute(
        delete(PersonHistory).where(PersonHistory.person_id == FRANKENSTEIN_LOUIS_JODI_ID)
    )
    await db.execute(
        delete(DetectedSignalPerson).where(
            DetectedSignalPerson.person_id == FRANKENSTEIN_LOUIS_JODI_ID
        )
    )
    await db.delete(frankenstein)
    logger.info("Deleted Frankenstein Louis/Jodi person record.")


async def heal_bruno_group(db) -> None:
    logger.info("Healing Bruno Kanashiro group records...")
    frankenstein = await db.get(Person, FRANKENSTEIN_BRUNO_GROUP_ID)
    if not frankenstein:
        logger.info("Frankenstein Bruno group record already removed.")
        return

    bruno = await db.get(Person, BRUNO_KANASHIRO_ID)
    galih = await db.get(Person, GALIH_RAMADHANI_ID)
    van = await db.get(Person, VAN_LE_ID)
    anelia = await db.get(Person, ANELIA_SPASOVA_ID)
    assert bruno and galih and van and anelia, "Natural persons for Bruno group must exist"

    # 1. Activities
    act_res = await db.execute(
        select(Activity).where(Activity.person_id == FRANKENSTEIN_BRUNO_GROUP_ID)
    )
    for act in act_res.scalars().all():
        title = act.title or ""
        attrs = dict(act.attributes or {})
        if "Galih Rizky Ramadhani" in title and "Bruno" not in title:
            act.person_id = GALIH_RAMADHANI_ID
        elif "Anelia Spasova" in title and "Bruno" not in title:
            act.person_id = ANELIA_SPASOVA_ID
        elif "Van Le" in title and "Bruno" not in title:
            act.person_id = VAN_LE_ID
        elif "Bruno Kanashiro (" in title:
            act.person_id = BRUNO_KANASHIRO_ID
        else:
            # Multi-person group
            act.person_id = BRUNO_KANASHIRO_ID
            attrs["participant_person_ids"] = [
                str(BRUNO_KANASHIRO_ID),
                str(GALIH_RAMADHANI_ID),
                str(VAN_LE_ID),
                str(ANELIA_SPASOVA_ID),
            ]
        act.attributes = attrs
        logger.info("Reassigned activity %s (%s) to %s", act.id, act.title, act.person_id)

    # 2. Leads
    lead_res = await db.execute(select(Lead).where(Lead.person_id == FRANKENSTEIN_BRUNO_GROUP_ID))
    for lead in lead_res.scalars().all():
        ref = lead.source_ref_id or ""
        if "dc203527" in ref:
            lead.person_id = GALIH_RAMADHANI_ID
        elif "d38527f8" in ref:
            lead.person_id = ANELIA_SPASOVA_ID
        elif "5c25a32c" in ref:
            lead.person_id = VAN_LE_ID
        else:
            lead.person_id = BRUNO_KANASHIRO_ID

    # 3. Signals
    sig_res = await db.execute(
        select(DetectedSignal).where(DetectedSignal.person_id == FRANKENSTEIN_BRUNO_GROUP_ID)
    )
    for sig in sig_res.scalars().all():
        sig.person_id = BRUNO_KANASHIRO_ID
        for pid in [BRUNO_KANASHIRO_ID, GALIH_RAMADHANI_ID, VAN_LE_ID, ANELIA_SPASOVA_ID]:
            await _ensure_signal_person(db, sig.id, pid, "participant")

    # 4. Intake LinkedIn Messages
    intake_res = await db.execute(
        select(IntakeLinkedInMessage).where(
            IntakeLinkedInMessage.resolved_person_id == FRANKENSTEIN_BRUNO_GROUP_ID
        )
    )
    for m in intake_res.scalars().all():
        if m.participant_names == "Galih Rizky Ramadhani":
            m.resolved_person_id = GALIH_RAMADHANI_ID
        elif m.participant_names == "Anelia Spasova":
            m.resolved_person_id = ANELIA_SPASOVA_ID
        elif m.participant_names == "Van Le":
            m.resolved_person_id = VAN_LE_ID
        elif m.participant_names == "Bruno Kanashiro":
            m.resolved_person_id = BRUNO_KANASHIRO_ID
        else:
            m.resolved_person_id = BRUNO_KANASHIRO_ID

    # 5. Delete PersonHistory and Frankenstein Person
    await db.execute(
        delete(PersonHistory).where(PersonHistory.person_id == FRANKENSTEIN_BRUNO_GROUP_ID)
    )
    await db.execute(
        delete(DetectedSignalPerson).where(
            DetectedSignalPerson.person_id == FRANKENSTEIN_BRUNO_GROUP_ID
        )
    )
    await db.delete(frankenstein)
    logger.info("Deleted Frankenstein Bruno group person record.")


async def _ensure_signal_person(db, signal_id: UUID, person_id: UUID, role: str) -> None:
    stmt = select(DetectedSignalPerson).where(
        DetectedSignalPerson.detected_signal_id == signal_id,
        DetectedSignalPerson.person_id == person_id,
    )
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if not existing:
        db.add(
            DetectedSignalPerson(
                detected_signal_id=signal_id,
                person_id=person_id,
                role=role,
            )
        )


async def main():
    async with AsyncSessionLocal() as db:
        await heal_louis_and_jodi(db)
        await heal_bruno_group(db)
        await db.commit()
    logger.info("Healing completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
