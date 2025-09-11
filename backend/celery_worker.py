#!/usr/bin/env python3
"""
Celery worker entry point for NDIS System

Run with: celery -A celery_worker worker --loglevel=info
"""

from app.core.celery_app import celery_app

if __name__ == '__main__':
    celery_app.start()