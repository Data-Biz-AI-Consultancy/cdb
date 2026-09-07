#!/usr/bin/env python3
"""
heal_activity_timestamps.py

Retroactively heals Activity and IntakeLinkedInMessage records in CDB that
received erroneous 'now()' timestamps during historical ingestion.

Sources timestamps from:
1. IntakeLinkedInMessage.last_sent_at (if already populated)
2. IntakeLinkedInMessage.raw_payload['last_sent_at'] (if available)
3. Jager PostgreSQL database (s_linkedin.messages table) if JAGER_DATABASE_URL is provided or Jager is reachable.
"""

import asyncio
import datetime
import logging
import os
import sys

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(SCRIPT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from cdb.core.config import settings  # noqa: E402
from cdb.models.activity import Activity  # noqa: E402
from cdb.models.intake import IntakeLinkedInMessage  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("heal_timestamps")


async def get_jager_timestamps(conversation_ids: list[str]) -> dict[str, datetime.datetime]:
    """Queries Jager database for authentic MAX(sent_at) per conversation_id."""
    jager_url = settings.JAGER_DATABASE_URL or os.getenv(
        "JAGER_DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/jager",
    )
    # Convert standard postgres:// or postgresql:// to asyncpg if needed
    if jager_url.startswith("postgresql://"):
        async_jager_url = jager_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif jager_url.startswith("postgres://"):
        async_jager_url = jager_url.replace("postgres://", "postgresql+asyncpg://", 1)
    else:
        async_jager_url = jager_url

    results: dict[str, datetime.datetime] = {}
    try:
        jager_engine = create_async_engine(async_jager_url, echo=False)
        async with jager_engine.connect() as conn:
            stmt = text(
                """
                SELECT conversation_id, MAX(sent_at) as last_sent_at
                FROM s_linkedin.messages
                WHERE conversation_id = ANY(:convo_ids)
                GROUP BY conversation_id
                """
            )
            rows = await conn.execute(stmt, {"convo_ids": conversation_ids})
            for r in rows:
                if r.last_sent_at:
                    results[str(r.conversation_id)] = r.last_sent_at
        await jager_engine.dispose()
    except Exception as e:
        logger.warning(
            "Could not connect to Jager database at %s to fetch original sent_at: %s",
            jager_url,
            e,
        )
    return results


async def heal_activity_timestamps():
    logger.info("Starting LinkedIn message activity timestamp healing...")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with async_session() as session:
        # 1. Find all LinkedIn message activities
        stmt = select(Activity).where(Activity.type == "linkedin_message")
        activities = (await session.execute(stmt)).scalars().all()
        logger.info("Found %d LinkedIn message activities in CDB.", len(activities))

        if not activities:
            logger.info("No LinkedIn message activities to heal.")
            return

        convo_to_activity: dict[str, list[Activity]] = {}
        convo_ids = []
        for act in activities:
            if act.source_id and act.source_id.startswith("li_msg:"):
                convo_id = act.source_id.split("li_msg:", 1)[1].strip()
                if convo_id:
                    convo_to_activity.setdefault(convo_id, []).append(act)
                    convo_ids.append(convo_id)

        # 2. Query Intake records
        intake_stmt = select(IntakeLinkedInMessage).where(
            IntakeLinkedInMessage.conversation_id.in_(convo_ids)
        )
        intake_rows = (await session.execute(intake_stmt)).scalars().all()
        intake_map: dict[str, IntakeLinkedInMessage] = {
            row.conversation_id: row for row in intake_rows
        }

        # 3. Query Jager if available for any missing timestamps
        jager_timestamps = await get_jager_timestamps(convo_ids)

        healed_count = 0
        for convo_id, acts in convo_to_activity.items():
            real_timestamp: datetime.datetime | None = None

            # Priority 1: From Jager original sent_at
            if convo_id in jager_timestamps:
                real_timestamp = jager_timestamps[convo_id]

            intake = intake_map.get(convo_id)
            # Priority 2: From IntakeLinkedInMessage.last_sent_at
            if not real_timestamp and intake and intake.last_sent_at:
                real_timestamp = intake.last_sent_at

            # Priority 3: From Intake raw_payload
            if not real_timestamp and intake and intake.raw_payload:
                for dt_key in ["last_sent_at", "latest_message_date", "sent_at"]:
                    v = intake.raw_payload.get(dt_key)
                    if v:
                        try:
                            real_timestamp = datetime.datetime.fromisoformat(
                                str(v).replace("Z", "+00:00")
                            )
                            break
                        except Exception:
                            pass

            if real_timestamp:
                # Update intake if needed
                if intake and intake.last_sent_at != real_timestamp:
                    intake.last_sent_at = real_timestamp

                # Update activities
                for act in acts:
                    if act.occurred_at != real_timestamp:
                        act.occurred_at = real_timestamp
                        healed_count += 1

        await session.commit()
        logger.info(
            "Timestamp healing complete: %d activity records successfully updated with genuine timestamps.",
            healed_count,
        )

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(heal_activity_timestamps())
