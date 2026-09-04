import asyncio
import os

from celery import Celery

from cdb.core.database import AsyncSessionLocal
from cdb.services.entity_resolution.service import run_full_er_scan
from cdb.services.segmentation.service import evaluate_segments_and_temperature

REDIS_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6380/0")

celery_app = Celery(
    "cdb_worker",
    broker=REDIS_URL,
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6380/0"),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


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
    from cdb.services.connectors.linkedin import LinkedInConnectorService

    async with AsyncSessionLocal() as session:
        service = LinkedInConnectorService()
        return await service.sync(
            session,
            sync_messages=sync_messages,
            sync_connections=sync_connections,
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
