"""
cdb.services.signals.catalog.service

Service operations for querying, aggregating, and ensuring the signals catalog dimension.
"""

from collections.abc import Sequence

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from cdb.models.signal import Signal
from cdb.schemas.signals import (
    SignalCatalogResponse,
    SignalCatalogSummary,
    SignalCategory,
    SignalDefinition,
    SignalSeverity,
    SignalTargetEntity,
)
from cdb.services.signals.catalog.data import INITIAL_SIGNAL_CATALOG


async def ensure_signals_dimension(db: AsyncSession) -> None:
    """
    Ensures all default signals in INITIAL_SIGNAL_CATALOG exist in the dimension table.
    Guarantees dimension records exist in both test environments and fresh databases.
    """
    existing_signals = (await db.execute(select(Signal.id))).scalars().all()
    existing_set = set(existing_signals)

    added = False
    for sig in INITIAL_SIGNAL_CATALOG:
        if sig["id"] not in existing_set:
            db_signal = Signal(
                id=sig["id"],
                name=sig["name"],
                category=sig["category"],
                target_entity=sig["target_entity"],
                severity=sig["severity"],
                detection_mechanism=sig["detection_mechanism"],
                description=sig.get("description"),
                business_interpretation=sig["business_interpretation"],
                parameters=sig.get("parameters", {}),
                recommended_action=sig.get("recommended_action", {}),
                icon=sig.get("icon"),
                color=sig.get("color"),
                is_active=sig.get("is_active", True),
            )
            db.add(db_signal)
            added = True

    if added:
        await db.flush()


async def get_signals_from_db(
    db: AsyncSession,
    category: SignalCategory | None = None,
    target_entity: SignalTargetEntity | None = None,
    severity: SignalSeverity | None = None,
    active_only: bool = True,
) -> Sequence[Signal]:
    """
    Fetch signal definitions from the PostgreSQL dimension table with optional filtering.
    """
    await ensure_signals_dimension(db)
    stmt: Select = select(Signal)
    if active_only:
        stmt = stmt.where(Signal.is_active.is_(True))
    if category:
        stmt = stmt.where(Signal.category == category.value)
    if target_entity:
        stmt = stmt.where(Signal.target_entity == target_entity.value)
    if severity:
        stmt = stmt.where(Signal.severity == severity.value)

    stmt = stmt.order_by(Signal.category, Signal.name)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_signal_by_id(db: AsyncSession, signal_id: str) -> Signal | None:
    """
    Fetch a single signal definition by slug ID from the dimension table.
    """
    await ensure_signals_dimension(db)
    stmt = select(Signal).where(Signal.id == signal_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


def compute_catalog_summary(signals: Sequence[Signal]) -> SignalCatalogSummary:
    """
    Calculates summary aggregate counts across catalog records.
    """
    by_category: dict[str, int] = {}
    by_target_entity: dict[str, int] = {}
    by_severity: dict[str, int] = {}

    for s in signals:
        by_category[s.category] = by_category.get(s.category, 0) + 1
        by_target_entity[s.target_entity] = by_target_entity.get(s.target_entity, 0) + 1
        by_severity[s.severity] = by_severity.get(s.severity, 0) + 1

    return SignalCatalogSummary(
        total_signals=len(signals),
        by_category=by_category,
        by_target_entity=by_target_entity,
        by_severity=by_severity,
    )


async def get_catalog_response(
    db: AsyncSession,
    category: SignalCategory | None = None,
    target_entity: SignalTargetEntity | None = None,
    severity: SignalSeverity | None = None,
    active_only: bool = True,
) -> SignalCatalogResponse:
    """
    Builds the complete catalog response with summary statistics.
    """
    # Fetch all active signals for overall summary computation
    all_active_signals = await get_signals_from_db(db, active_only=active_only)
    summary = compute_catalog_summary(all_active_signals)

    # If filters applied, fetch filtered list
    if category or target_entity or severity:
        filtered_signals = await get_signals_from_db(
            db,
            category=category,
            target_entity=target_entity,
            severity=severity,
            active_only=active_only,
        )
        data = [SignalDefinition.model_validate(s) for s in filtered_signals]
    else:
        data = [SignalDefinition.model_validate(s) for s in all_active_signals]

    return SignalCatalogResponse(data=data, summary=summary)
