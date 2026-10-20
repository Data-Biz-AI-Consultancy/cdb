import asyncio

from cdb.core.database import AsyncSessionLocal
from cdb.services.entity_resolution.service import run_full_er_scan
from cdb.services.segmentation.service import evaluate_segments_and_temperature
from cdb.workers.celery_app import celery_app


async def _run_er_scan_async():
    async with AsyncSessionLocal() as session:
        res = await run_full_er_scan(session)
        return {"status": res.status, "job_id": res.job_id}


async def _evaluate_segments_async():
    async with AsyncSessionLocal() as session:
        return await evaluate_segments_and_temperature(session)


@celery_app.task(name="cdb.workers.tasks.run_full_er_background")
def run_full_er_background():
    """Background task to execute full entity resolution scan."""
    return asyncio.run(_run_er_scan_async())


@celery_app.task(name="cdb.workers.tasks.evaluate_segments_background")
def evaluate_segments_background():
    """Background task to evaluate dynamic contact segments & temperatures."""
    return asyncio.run(_evaluate_segments_async())


async def _sync_linkedin_direct_async(sync_messages: bool = True, sync_connections: bool = True):
    from cdb.core.config import settings
    from cdb.services.connectors.linkedin import LinkedInConnectorService

    if not (settings.LINKEDIN_ACCESS_TOKEN or "").strip():
        return {
            "status": "not_configured",
            "connector": "linkedin",
            "message": "LINKEDIN_ACCESS_TOKEN is not configured.",
        }

    async with AsyncSessionLocal() as session:
        service = LinkedInConnectorService()
        return await service.sync(
            session,
            sync_messages=sync_messages,
            sync_connections=sync_connections,
            owner_name=settings.LINKEDIN_ACCOUNT_OWNER_NAME,
        )


@celery_app.task(name="cdb.workers.tasks.sync_linkedin_direct")
def sync_linkedin_direct_background(sync_messages: bool = True, sync_connections: bool = True):
    """Background task to directly pull LinkedIn messages & connections into CDB."""
    return asyncio.run(
        _sync_linkedin_direct_async(
            sync_messages=sync_messages,
            sync_connections=sync_connections,
        )
    )


def _notion_self_hosted_block(source: str) -> dict[str, str] | None:
    """Return a not-configured result when the chosen self-hosted source lacks credentials."""
    from cdb.core.config import settings

    api_key = (settings.NOTION_API_KEY or "").strip()
    database_ids = [
        str(db_id).strip()
        for db_id in (settings.NOTION_MEETING_NOTES_DATABASE_IDS or [])
        if str(db_id).strip()
    ]
    jager_url = (settings.JAGER_DATABASE_URL or "").strip()

    if source == "jager_db":
        return None
    if source == "notion_api" and (not api_key or not database_ids):
        return {
            "status": "not_configured",
            "connector": "notion",
            "source": source,
            "message": "NOTION_API_KEY and NOTION_MEETING_NOTES_DATABASE_IDS are required for Notion API sync.",
        }
    if source != "notion_api" and api_key and not database_ids:
        return {
            "status": "not_configured",
            "connector": "notion",
            "source": source,
            "message": "NOTION_MEETING_NOTES_DATABASE_IDS are required when Notion sync uses the API.",
        }
    if source != "notion_api" and not api_key and not jager_url:
        return {
            "status": "not_configured",
            "connector": "notion",
            "source": source,
            "message": "Neither NOTION_API_KEY nor JAGER_DATABASE_URL is configured for Notion sync.",
        }
    return None


async def _sync_notion_direct_async(source: str = "auto"):
    from cdb.services.connectors.notion import NotionConnectorService

    blocked = _notion_self_hosted_block(source)
    if blocked is not None:
        return blocked

    async with AsyncSessionLocal() as session:
        service = NotionConnectorService()
        return await service.sync(session, source=source)


@celery_app.task(name="cdb.workers.tasks.sync_notion_direct")
def sync_notion_direct_background(source: str = "auto"):
    """Background task to directly pull Notion meeting notes into CDB."""
    return asyncio.run(_sync_notion_direct_async(source=source))


async def _evaluate_signals_async():
    from cdb.services.signals.detector import evaluate_all_signals

    async with AsyncSessionLocal() as session:
        return await evaluate_all_signals(session)


@celery_app.task(name="cdb.workers.tasks.evaluate_signals_background")
def evaluate_signals_background():
    """Periodic background task to scan and detect opportunity and risk signals."""
    return asyncio.run(_evaluate_signals_async())
