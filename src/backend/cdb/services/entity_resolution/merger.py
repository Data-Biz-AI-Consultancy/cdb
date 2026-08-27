import datetime
import json
import uuid
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.activity import Activity
from cdb.models.er import ERCandidatePair
from cdb.models.lead import Lead
from cdb.models.opportunity import OpportunityPerson
from cdb.models.person import Person
from cdb.models.relationship import PersonCompanyRelationship


def choose_master_record(person_a: Person, person_b: Person) -> tuple[Person, Person]:
    """Returns (master, subordinate) based on created_at or field richness."""
    created_a = person_a.created_at or datetime.datetime.min.replace(tzinfo=datetime.UTC)
    created_b = person_b.created_at or datetime.datetime.min.replace(tzinfo=datetime.UTC)

    if created_a < created_b:
        return person_a, person_b
    elif created_b < created_a:
        return person_b, person_a

    # If tied, prefer the record with more non-null fields
    count_a = sum(
        1
        for v in [
            person_a.first_name,
            person_a.last_name,
            person_a.primary_email,
            person_a.linkedin_url,
            person_a.primary_phone,
            person_a.city,
            person_a.country,
        ]
        if v is not None
    )
    count_b = sum(
        1
        for v in [
            person_b.first_name,
            person_b.last_name,
            person_b.primary_email,
            person_b.linkedin_url,
            person_b.primary_phone,
            person_b.city,
            person_b.country,
        ]
        if v is not None
    )

    if count_a >= count_b:
        return person_a, person_b
    return person_b, person_a


def _normalize_sources(src: Any) -> list[str]:
    if isinstance(src, list):
        return [str(s) for s in src if s]
    elif isinstance(src, str):
        try:
            parsed = json.loads(src)
            if isinstance(parsed, list):
                return [str(s) for s in parsed if s]
        except Exception:
            pass
        return [src] if src else []
    return []


def compute_merged_attributes(master: Person, sub: Person) -> dict[str, Any]:
    updates: dict[str, Any] = {}

    # 1. Names: prefer longer / compound name
    if sub.first_name and (not master.first_name or len(sub.first_name) > len(master.first_name)):
        updates["first_name"] = sub.first_name
    if sub.last_name and (not master.last_name or len(sub.last_name) > len(master.last_name)):
        updates["last_name"] = sub.last_name

    # 2. Email: keep master primary_email, append sub emails to secondary_emails
    sec_emails = list(master.secondary_emails or [])
    if sub.primary_email and sub.primary_email != master.primary_email:
        if sub.primary_email not in sec_emails:
            sec_emails.append(sub.primary_email)
    for e in sub.secondary_emails or []:
        if e and e != master.primary_email and e not in sec_emails:
            sec_emails.append(e)
    updates["secondary_emails"] = sec_emails

    # 3. Phone: prefer non-null
    if not master.primary_phone and sub.primary_phone:
        updates["primary_phone"] = sub.primary_phone

    # 4. LinkedIn: prefer non-null
    if not master.linkedin_url and sub.linkedin_url:
        updates["linkedin_url"] = sub.linkedin_url

    # 5. Other social/location fields
    for field in [
        "twitter_handle",
        "facebook_id",
        "whatsapp_phone",
        "city",
        "country",
        "avatar_url",
    ]:
        if not getattr(master, field) and getattr(sub, field):
            updates[field] = getattr(sub, field)

    # 6. Attributes: deep merge (keep master values on key conflict)
    merged_attrs = dict(sub.attributes or {})
    merged_attrs.update(master.attributes or {})
    updates["attributes"] = merged_attrs

    # 7. Sources: union
    all_sources = set(_normalize_sources(master.sources))
    all_sources.update(_normalize_sources(sub.sources))
    updates["sources"] = list(all_sources)

    # 8. Source IDs: merge
    merged_source_ids = dict(sub.source_ids or {})
    merged_source_ids.update(master.source_ids or {})
    updates["source_ids"] = merged_source_ids

    return updates


async def merge_persons(
    db: AsyncSession,
    person_a_id: uuid.UUID,
    person_b_id: uuid.UUID,
) -> tuple[uuid.UUID, uuid.UUID]:
    """
    Merges person_b into person_a (or whichever is chosen as master),
    relinks all FKs, updates candidate pairs, and deletes subordinate record.
    """
    res_a = await db.execute(select(Person).where(Person.id == person_a_id))
    person_a = res_a.scalar_one_or_none()

    res_b = await db.execute(select(Person).where(Person.id == person_b_id))
    person_b = res_b.scalar_one_or_none()

    if not person_a or not person_b:
        raise ValueError("One or both persons not found for merge.")

    master, sub = choose_master_record(person_a, person_b)
    master_id = master.id
    sub_id = sub.id

    # 1. Compute merged attributes before modifying or deleting any rows
    merged_updates = compute_merged_attributes(master, sub)

    # 2. Re-link Foreign Keys
    await db.execute(
        update(Activity).where(Activity.person_id == sub_id).values(person_id=master_id)
    )
    await db.execute(update(Lead).where(Lead.person_id == sub_id).values(person_id=master_id))

    # Relink OpportunityPerson (handle potential primary key conflict)
    opp_persons_sub = (
        (await db.execute(select(OpportunityPerson).where(OpportunityPerson.person_id == sub_id)))
        .scalars()
        .all()
    )
    for opp_p in opp_persons_sub:
        opp_id = opp_p.opportunity_id
        existing = (
            await db.execute(
                select(OpportunityPerson).where(
                    OpportunityPerson.opportunity_id == opp_id,
                    OpportunityPerson.person_id == master_id,
                )
            )
        ).scalar_one_or_none()
        if not existing:
            opp_p.person_id = master_id
        else:
            await db.delete(opp_p)

    # Relink PersonCompanyRelationship (avoid unique constraint clash)
    rel_sub = (
        (
            await db.execute(
                select(PersonCompanyRelationship).where(
                    PersonCompanyRelationship.person_id == sub_id
                )
            )
        )
        .scalars()
        .all()
    )
    for r in rel_sub:
        existing_r = (
            await db.execute(
                select(PersonCompanyRelationship).where(
                    PersonCompanyRelationship.person_id == master_id,
                    PersonCompanyRelationship.company_id == r.company_id,
                    PersonCompanyRelationship.title == r.title,
                )
            )
        ).scalar_one_or_none()
        if not existing_r:
            r.person_id = master_id
        else:
            await db.delete(r)

    # 3. Update & clean up candidate pairs involving the subordinate person
    sub_pairs = (
        (
            await db.execute(
                select(ERCandidatePair).where(
                    (ERCandidatePair.person_a_id == sub_id)
                    | (ERCandidatePair.person_b_id == sub_id)
                )
            )
        )
        .scalars()
        .all()
    )

    for p in sub_pairs:
        other_id = p.person_b_id if p.person_a_id == sub_id else p.person_a_id
        if other_id == master_id:
            await db.delete(p)
        else:
            existing_pair = (
                await db.execute(
                    select(ERCandidatePair).where(
                        (
                            (ERCandidatePair.person_a_id == master_id)
                            & (ERCandidatePair.person_b_id == other_id)
                        )
                        | (
                            (ERCandidatePair.person_a_id == other_id)
                            & (ERCandidatePair.person_b_id == master_id)
                        )
                    )
                )
            ).scalar_one_or_none()
            if existing_pair:
                await db.delete(p)
            else:
                if p.person_a_id == sub_id:
                    p.person_a_id = master_id
                else:
                    p.person_b_id = master_id

    # 4. Delete subordinate person and flush to release unique constraints in DB
    await db.delete(sub)
    await db.flush()

    # 5. Apply merged updates to master record now that sub is deleted
    for k, v in merged_updates.items():
        setattr(master, k, v)

    await db.commit()
    await db.refresh(master)

    return master_id, sub_id
