#!/usr/bin/env python3
"""
Celery worker entry point for NDIS System

Run with: celery -A celery_worker worker --loglevel=info
"""

import os
import sys
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Set environment variables before importing anything
os.environ.setdefault('CELERY_WORKER', '1')

# Import the celery app
from app.core.celery_app import celery_app

# Import all models to ensure SQLAlchemy relationships work
from app.models import User, Referral, EmailLog

# Import all task modules to ensure they're registered
import app.tasks.email_tasks

# Make celery app available for the worker command
app = celery_app

if __name__ == '__main__':
    app.start()