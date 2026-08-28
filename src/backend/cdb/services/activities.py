import datetime
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.core.errors import NotFoundError
from cdb.models.activity import Activity
from cdb.schemas.activity import ActivityCreate, ActivityResponse, ActivityUpdate
from cdb.schemas.common import PaginationMetadata


async def list_activities(
    db: AsyncSession,
    person_id: uuid.UUID | None = None,
    company_id: uuid.UUID | None = None,
    type: str | None = None,
    source: str | None = None,
    from_date: datetime.datetime | None = None,
    to_date: datetime.datetime | None = None,
    limit: int = 50,
    cursor: str | None = None,
    sort: str = "occurred_at",
    order: str = "desc",
) -> tuple[list[ActivityResponse], PaginationMetadata]:
    stmt = select(Activity)

    if person_id:
        stmt = stmt.where(Activity.person_id == person_id)
    if company_id:
        stmt = stmt.where(Activity.company_id == company_id)
    if type:
        stmt = stmt.where(Activity.type == type)
    if source:
        stmt = stmt.where(Activity.source == source)
    if from_date:
        stmt = stmt.where(Activity.occurred_at >= from_date)
    if to_date:
        stmt = stmt.where(Activity.occurred_at <= to_date)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    if order.lower() == "asc":
        stmt = stmt.order_by(getattr(Activity, sort, Activity.occurred_at).asc())
    else:
        stmt = stmt.order_by(getattr(Activity, sort, Activity.occurred_at).desc())

    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    activities = (await db.execute(stmt)).scalars().all()

    items = [ActivityResponse.model_validate(a) for a in activities]
    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    return items, PaginationMetadata(next_cursor=next_cursor, has_more=has_more, total=total)


async def create_activity(db: AsyncSession, data: ActivityCreate) -> ActivityResponse:
    act = Activity(
        person_id=data.person_id,
        company_id=data.company_id,
        type=data.type,
        source=data.source,
        source_id=data.source_id,
        occurred_at=data.occurred_at or datetime.datetime.now(datetime.UTC),
        title=data.title,
        summary=data.summary,
        raw_content=data.raw_content,
        attributes=data.attributes,
    )
    db.add(act)
    await db.flush()

    if act.person_id:
        from cdb.services.person_history import record_person_history

        action_id = "note_added" if act.type == "note" else "activity_logged"
        summary = (
            f"Added note: {act.title or act.summary or 'Quick note'}"
            if act.type == "note"
            else f"Logged {act.type}: {act.title or act.summary or ''}"
        )
        await record_person_history(
            db,
            person_id=act.person_id,
            action_id=action_id,
            summary=summary,
        )

    await db.commit()
    await db.refresh(act)
    return ActivityResponse.model_validate(act)


async def get_activity(db: AsyncSession, activity_id: uuid.UUID) -> ActivityResponse:
    act = (
        await db.execute(select(Activity).where(Activity.id == activity_id))
    ).scalar_one_or_none()
    if not act:
        raise NotFoundError(f"Activity with id {activity_id} not found.")
    return ActivityResponse.model_validate(act)


async def update_activity(
    db: AsyncSession, activity_id: uuid.UUID, data: ActivityUpdate
) -> ActivityResponse:
    act = (
        await db.execute(select(Activity).where(Activity.id == activity_id))
    ).scalar_one_or_none()
    if not act:
        raise NotFoundError(f"Activity with id {activity_id} not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(act, k, v)

    await db.commit()
    await db.refresh(act)
    return ActivityResponse.model_validate(act)


async def delete_activity(db: AsyncSession, activity_id: uuid.UUID) -> None:
    act = (
        await db.execute(select(Activity).where(Activity.id == activity_id))
    ).scalar_one_or_none()
    if not act:
        raise NotFoundError(f"Activity with id {activity_id} not found.")
    await db.delete(act)
    await db.commit()
