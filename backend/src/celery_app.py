from celery import Celery
from src.config.settings import settings

celery_app = Celery(
    "intellihire",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "src.core.tasks.resume_tasks",
        "src.core.tasks.application_tasks",
        "src.core.tasks.sourcing_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_concurrency=4,
    task_routes={
        "src.core.tasks.sourcing_tasks.*":    {"queue": "heavy"},
        "src.core.tasks.application_tasks.*": {"queue": "default"},
        "src.core.tasks.resume_tasks.*":      {"queue": "default"},
    },
)