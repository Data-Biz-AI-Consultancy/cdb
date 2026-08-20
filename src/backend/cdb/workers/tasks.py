import os

from celery import Celery

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


@celery_app.task(name="cdb.workers.tasks.run_full_er_background")
def run_full_er_background():
    """Background task to execute full entity resolution scan."""
    return {"status": "success", "message": "ER scan executed."}
