import datetime
import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from cdb.core.errors import NotFoundError
from cdb.models.activity import Activity
from cdb.models.company import Company
from cdb.models.person import Person
from cdb.schemas.activity import (
    ActivityCreate,
    ActivityResponse,
    ActivityStatsResponse,
    ActivityTimelineBucket,
    ActivityUpdate,
)
from cdb.schemas.common import PaginationMetadata


async def get_activity_stats(db: AsyncSession) -> ActivityStatsResponse:
    total_stmt = select(func.count(Activity.id))
    total = (await db.execute(total_stmt)).scalar() or 0

    type_stmt = select(Activity.type, func.count(Activity.id)).group_by(Activity.type)
    type_rows = (await db.execute(type_stmt)).all()
    by_type = {row[0]: row[1] for row in type_rows if row[0]}

    source_stmt = select(Activity.source, func.count(Activity.id)).group_by(Activity.source)
    source_rows = (await db.execute(source_stmt)).all()
    by_source = {row[0]: row[1] for row in source_rows if row[0]}

    # Timeline daily aggregation (dialect-agnostic)
    timeline_stmt = select(Activity.occurred_at, Activity.type).where(
        Activity.occurred_at.is_not(None)
    )
    timeline_rows = (await db.execute(timeline_stmt)).all()

    timeline_dict: dict[str, dict[str, int]] = {}
    for dt, act_type in timeline_rows:
        if not dt or not act_type:
            continue
        day_str = (
            dt.strftime("%Y-%m-%d")
            if isinstance(dt, (datetime.datetime, datetime.date))
            else str(dt)[:10]
        )
        if day_str not in timeline_dict:
            timeline_dict[day_str] = {}
        timeline_dict[day_str][act_type] = timeline_dict[day_str].get(act_type, 0) + 1

    timeline = [
        ActivityTimelineBucket(
            date=day_str,
            total=sum(types_map.values()),
            by_type=types_map,
        )
        for day_str, types_map in sorted(timeline_dict.items())
    ]

    return ActivityStatsResponse(
        total=total, by_type=by_type, by_source=by_source, timeline=timeline
    )


async def list_activities(
    db: AsyncSession,
    q: str | None = None,
    person_id: uuid.UUID | None = None,
    company_id: uuid.UUID | None = None,
    type: str | None = None,
    source: str | None = None,
    from_date: datetime.datetime | None = None,
    to_date: datetime.datetime | None = None,
    page: int | None = None,
    limit: int = 50,
    cursor: str | None = None,
    sort: str = "occurred_at",
    order: str = "desc",
) -> tuple[list[ActivityResponse], PaginationMetadata]:
    stmt = select(Activity).options(
        selectinload(Activity.person),
        selectinload(Activity.company),
    )

    if q and q.strip():
        q_term = f"%{q.strip()}%"
        stmt = (
            stmt.outerjoin(Person, Activity.person_id == Person.id)
            .outerjoin(Company, Activity.company_id == Company.id)
            .where(
                or_(
                    Activity.title.ilike(q_term),
                    Activity.summary.ilike(q_term),
                    Activity.raw_content.ilike(q_term),
                    Person.first_name.ilike(q_term),
                    Person.last_name.ilike(q_term),
                    Person.primary_email.ilike(q_term),
                    Company.name.ilike(q_term),
                )
            )
        )

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

    sort_col = getattr(Activity, sort, Activity.occurred_at)
    if order.lower() == "asc":
        stmt = stmt.order_by(sort_col.asc(), Activity.id.asc())
    else:
        stmt = stmt.order_by(sort_col.desc(), Activity.id.desc())

    offset = 0
    if page is not None and page >= 1:
        offset = (page - 1) * limit
    elif cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    activities = (await db.execute(stmt)).scalars().all()

    items = [ActivityResponse.model_validate(a) for a in activities]
    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    return items, PaginationMetadata(
        page=page,
        page_size=limit,
        next_cursor=next_cursor,
        has_more=has_more,
        total=total,
    )


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
    # Refresh with relationships loaded
    refreshed = (
        await db.execute(
            select(Activity)
            .options(
                selectinload(Activity.person),
                selectinload(Activity.company),
            )
            .where(Activity.id == act.id)
        )
    ).scalar_one()
    return ActivityResponse.model_validate(refreshed)


async def get_activity(db: AsyncSession, activity_id: uuid.UUID) -> ActivityResponse:
    act = (
        await db.execute(
            select(Activity)
            .options(
                selectinload(Activity.person),
                selectinload(Activity.company),
            )
            .where(Activity.id == activity_id)
        )
    ).scalar_one_or_none()
    if not act:
        raise NotFoundError(f"Activity with id {activity_id} not found.")
    return ActivityResponse.model_validate(act)


async def update_activity(
    db: AsyncSession, activity_id: uuid.UUID, data: ActivityUpdate
) -> ActivityResponse:
    act = (
        await db.execute(
            select(Activity)
            .options(
                selectinload(Activity.person),
                selectinload(Activity.company),
            )
            .where(Activity.id == activity_id)
        )
    ).scalar_one_or_none()
    if not act:
        raise NotFoundError(f"Activity with id {activity_id} not found.")

    update_dict = data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(act, k, v)

    await db.commit()
    refreshed = (
        await db.execute(
            select(Activity)
            .options(
                selectinload(Activity.person),
                selectinload(Activity.company),
            )
            .where(Activity.id == act.id)
        )
    ).scalar_one()
    return ActivityResponse.model_validate(refreshed)


async def delete_activity(db: AsyncSession, activity_id: uuid.UUID) -> None:
    act = (
        await db.execute(select(Activity).where(Activity.id == activity_id))
    ).scalar_one_or_none()
    if not act:
        raise NotFoundError(f"Activity with id {activity_id} not found.")
    await db.delete(act)
    await db.commit()
