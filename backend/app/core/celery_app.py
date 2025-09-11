import os
from celery import Celery
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Celery app instance
celery_app = Celery(
    "ndis_system",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0"),
    include=["app.tasks.email_tasks"]
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
    # Task routing
    task_routes={
        "app.tasks.email_tasks.send_referral_notifications": {"queue": "email"},
        "app.tasks.email_tasks.send_provider_notification": {"queue": "email"},
        "app.tasks.email_tasks.send_participant_confirmation": {"queue": "email"},
    },
    # Beat schedule for periodic tasks (if needed in future)
    beat_schedule={},
)

if __name__ == "__main__":
    celery_app.start()