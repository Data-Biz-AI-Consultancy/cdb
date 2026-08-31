import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.opportunity_history import OpportunityAction, OpportunityHistory
from cdb.schemas.common import PaginationMetadata
from cdb.schemas.opportunity_history import OpportunityActionResponse, OpportunityHistoryResponse

DEFAULT_OPPORTUNITY_ACTIONS: list[dict[str, Any]] = [
    {
        "id": "opp_created",
        "name": "Opportunity Created",
        "category": "pipeline",
        "description": "Initial creation of the sales opportunity",
        "icon": "✨",
        "color": "emerald",
    },
    {
        "id": "stage_changed",
        "name": "Stage Changed",
        "category": "pipeline",
        "description": "Opportunity moved to a different sales stage",
        "icon": "🔄",
        "color": "blue",
    },
    {
        "id": "value_updated",
        "name": "Deal Value Updated",
        "category": "deal",
        "description": "Expected deal value or currency changed",
        "icon": "💰",
        "color": "amber",
    },
    {
        "id": "person_attached",
        "name": "Person Attached",
        "category": "contacts",
        "description": "Contact person linked to the opportunity",
        "icon": "👤",
        "color": "indigo",
    },
    {
        "id": "person_detached",
        "name": "Person Detached",
        "category": "contacts",
        "description": "Contact person unlinked from the opportunity",
        "icon": "🚫",
        "color": "rose",
    },
    {
        "id": "company_attached",
        "name": "Company Attached",
        "category": "contacts",
        "description": "Company organization linked to the opportunity",
        "icon": "🏢",
        "color": "cyan",
    },
    {
        "id": "company_detached",
        "name": "Company Detached",
        "category": "contacts",
        "description": "Company organization unlinked from the opportunity",
        "icon": "🏢",
        "color": "rose",
    },
    {
        "id": "deal_won",
        "name": "Deal Won",
        "category": "pipeline",
        "description": "Opportunity marked as Closed Won",
        "icon": "🏆",
        "color": "emerald",
    },
    {
        "id": "deal_lost",
        "name": "Deal Lost",
        "category": "pipeline",
        "description": "Opportunity marked as Closed Lost",
        "icon": "❌",
        "color": "rose",
    },
    {
        "id": "field_updated",
        "name": "Field Updated",
        "category": "deal",
        "description": "Opportunity attributes, description or dates updated",
        "icon": "✏️",
        "color": "slate",
    },
    {
        "id": "note_added",
        "name": "Note Added",
        "category": "activity",
        "description": "Activity log or note attached to opportunity",
        "icon": "📝",
        "color": "purple",
    },
]


async def ensure_opportunity_actions(db: AsyncSession) -> None:
    """Ensures that default opportunity action dimensions exist in the database."""
    existing_actions = (await db.execute(select(OpportunityAction.id))).scalars().all()
    existing_set = set(existing_actions)

    for act_dict in DEFAULT_OPPORTUNITY_ACTIONS:
        if act_dict["id"] not in existing_set:
            act = OpportunityAction(
                id=act_dict["id"],
                name=act_dict["name"],
                category=act_dict["category"],
                description=act_dict.get("description"),
                icon=act_dict.get("icon"),
                color=act_dict.get("color"),
            )
            db.add(act)
    await db.flush()


async def list_opportunity_actions(db: AsyncSession) -> list[OpportunityActionResponse]:
    """Lists all available opportunity action dimensions."""
    await ensure_opportunity_actions(db)
    stmt = select(OpportunityAction).order_by(OpportunityAction.category, OpportunityAction.name)
    actions = (await db.execute(stmt)).scalars().all()
    return [OpportunityActionResponse.model_validate(a) for a in actions]


async def record_opportunity_history(
    db: AsyncSession,
    opportunity_id: uuid.UUID,
    action_id: str,
    changed_by_id: uuid.UUID | None = None,
    field_name: str | None = None,
    old_value: Any = None,
    new_value: Any = None,
    changes: dict[str, Any] | None = None,
    summary: str | None = None,
    commit: bool = False,
) -> OpportunityHistory:
    """Records an event in the opportunity_history changelog."""
    await ensure_opportunity_actions(db)

    history_item = OpportunityHistory(
        opportunity_id=opportunity_id,
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


async def list_opportunity_history(
    db: AsyncSession,
    opportunity_id: uuid.UUID,
    limit: int = 50,
    cursor: str | None = None,
    sort: str = "created_at",
    order: str = "desc",
) -> tuple[list[OpportunityHistoryResponse], PaginationMetadata]:
    """Retrieves paginated history for an opportunity record."""
    stmt = select(OpportunityHistory).where(OpportunityHistory.opportunity_id == opportunity_id)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    if order.lower() == "asc":
        stmt = stmt.order_by(getattr(OpportunityHistory, sort, OpportunityHistory.created_at).asc())
    else:
        stmt = stmt.order_by(
            getattr(OpportunityHistory, sort, OpportunityHistory.created_at).desc()
        )

    offset = 0
    if cursor and cursor.isdigit():
        offset = int(cursor)

    stmt = stmt.offset(offset).limit(limit)
    rows = (await db.execute(stmt)).scalars().all()

    items: list[OpportunityHistoryResponse] = []
    for r in rows:
        action_resp = None
        if r.action:
            action_resp = OpportunityActionResponse.model_validate(r.action)

        items.append(
            OpportunityHistoryResponse(
                id=r.id,
                opportunity_id=r.opportunity_id,
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
