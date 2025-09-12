import os
from celery import Celery
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Celery app instance
celery_app = Celery(
    "ndis_system",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=None,  # Disable result backend to avoid serialization issues
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Australia/Sydney",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    task_soft_time_limit=240,  # 4 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    # Retry configuration
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # Task discovery
    include=["app.tasks.email_tasks"],
    imports=["app.tasks.email_tasks"],
    # Beat schedule for periodic tasks (if needed in future)
    beat_schedule={},
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["app.tasks"])

if __name__ == "__main__":
    celery_app.start()