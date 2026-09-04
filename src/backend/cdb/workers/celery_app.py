from celery import Celery

from cdb.core.config import settings

celery_app = Celery(
    "cdb_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "sync-linkedin-direct-periodic": {
            "task": "cdb.workers.tasks.sync_linkedin_direct",
            "schedule": settings.LINKEDIN_SYNC_HOURS_INTERVAL * 3600,
            "args": (True, True),
        },
    },
)


@celery_app.task(name="health_check_task")
def health_check_task() -> str:
    return "celery worker healthy"
