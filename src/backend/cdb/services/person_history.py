import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.person_history import PersonAction, PersonHistory
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.person_history import PersonActionResponse, PersonHistoryResponse

DEFAULT_ACTIONS: list[dict[str, Any]] = [
    {
        "id": "record_created",
        "name": "Record Created",
        "category": "profile",
        "description": "Initial creation of the person golden record",
        "icon": "✨",
        "color": "emerald",
    },
    {
        "id": "profile_updated",
        "name": "Profile Updated",
        "category": "profile",
        "description": "Contact identity or direct fields updated",
        "icon": "✏️",
        "color": "blue",
    },
    {
        "id": "segment_changed",
        "name": "Segment Changed",
        "category": "segmentation",
        "description": "Contact segment classification updated",
        "icon": "🏷️",
        "color": "purple",
    },
    {
        "id": "temperature_changed",
        "name": "Temperature Changed",
        "category": "segmentation",
        "description": "Engagement temperature status updated",
        "icon": "🔥",
        "color": "amber",
    },
    {
        "id": "records_merged",
        "name": "Records Merged",
        "category": "entity_resolution",
        "description": "Merged with another duplicate record via entity resolution",
        "icon": "🔀",
        "color": "indigo",
    },
    {
        "id": "company_linked",
        "name": "Company Affiliation Changed",
        "category": "career",
        "description": "Company affiliation, role or tenure changed",
        "icon": "💼",
        "color": "cyan",
    },
    {
        "id": "lead_attached",
        "name": "Lead Attached",
        "category": "pipeline",
        "description": "Inbound lead attached to the person",
        "icon": "🎯",
        "color": "orange",
    },
    {
        "id": "lead_converted",
        "name": "Lead Converted",
        "category": "pipeline",
        "description": "Lead converted to an opportunity deal",
        "icon": "🚀",
        "color": "emerald",
    },
    {
        "id": "opportunity_attached",
        "name": "Opportunity Attached",
        "category": "pipeline",
        "description": "Sales opportunity or deal attached to the person",
        "icon": "💰",
        "color": "emerald",
    },
    {
        "id": "activity_logged",
        "name": "Activity Logged",
        "category": "pipeline",
        "description": "Interaction or message logged in person timeline",
        "icon": "💬",
        "color": "sky",
    },
    {
        "id": "note_added",
        "name": "Note Added",
        "category": "profile",
        "description": "Internal note or observation added to person record",
        "icon": "📝",
        "color": "amber",
    },
    {
        "id": "bulk_updated",
        "name": "Bulk Updated",
        "category": "bulk_ops",
        "description": "Modified as part of a batch/bulk update operation",
        "icon": "🧹",
        "color": "slate",
    },
]


async def ensure_person_actions(db: AsyncSession) -> None:
    """Ensures that default dimension actions exist in the database."""
    existing_actions = (await db.execute(select(PersonAction.id))).scalars().all()
    existing_set = set(existing_actions)

    for act_dict in DEFAULT_ACTIONS:
        if act_dict["id"] not in existing_set:
            act = PersonAction(
                id=act_dict["id"],
                name=act_dict["name"],
                category=act_dict["category"],
                description=act_dict.get("description"),
                icon=act_dict.get("icon"),
                color=act_dict.get("color"),
            )
            db.add(act)
    await db.flush()


async def list_person_actions(db: AsyncSession) -> list[PersonActionResponse]:
    """Lists all available person action dimensions."""
    await ensure_person_actions(db)
    stmt = select(PersonAction).order_by(PersonAction.category, PersonAction.name)
    actions = (await db.execute(stmt)).scalars().all()
    return [PersonActionResponse.model_validate(a) for a in actions]


async def record_person_history(
    db: AsyncSession,
    person_id: uuid.UUID,
    action_id: str,
    changed_by_id: uuid.UUID | None = None,
    field_name: str | None = None,
    old_value: Any = None,
    new_value: Any = None,
    changes: dict[str, Any] | None = None,
    summary: str | None = None,
    commit: bool = False,
) -> PersonHistory:
    """Records an event in the person_history changelog."""
    await ensure_person_actions(db)

    history_item = PersonHistory(
        person_id=person_id,
        action_id=action_id,
        changed_by_id=changed_by_id,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        changes=changes or {},
        summary=summary,
    )
    db.add(history_item)
    if commit:
        await db.commit()
        await db.refresh(history_item)
    else:
        await db.flush()
    return history_item


async def list_person_history(
    db: AsyncSession,
    person_id: uuid.UUID,
    limit: int = 50,
    cursor: str | None = None,
    sort: str = "created_at",
    order: str = "desc",
) -> tuple[list[PersonHistoryResponse], PaginationMetadata]:
    """Retrieves paginated history for a person record."""
    stmt = select(PersonHistory).where(PersonHistory.person_id == person_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    if order.lower() == "asc":
        stmt = stmt.order_by(getattr(PersonHistory, sort, PersonHistory.created_at).asc())
    else:
        stmt = stmt.order_by(getattr(PersonHistory, sort, PersonHistory.created_at).desc())

    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()

    items: list[PersonHistoryResponse] = []
    for r in rows:
        action_resp = None
        if r.action:
            action_resp = PersonActionResponse.model_validate(r.action)

        items.append(
            PersonHistoryResponse(
                id=r.id,
                person_id=r.person_id,
                action_id=r.action_id,
                action=action_resp,
                changed_by_id=r.changed_by_id,
                field_name=r.field_name,
                old_value=r.old_value,
                new_value=r.new_value,
                changes=r.changes or {},
                summary=r.summary,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )

    has_more = (offset + limit) < total
    next_cursor = str(offset + limit) if has_more else None

    return items, PaginationMetadata(next_cursor=next_cursor, has_more=has_more, total=total)
