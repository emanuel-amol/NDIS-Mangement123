#!/usr/bin/env python3
# backend/init_database.py
"""
Complete Database Initialization Script for NDIS Management System
Run this script to set up your database with all required tables and default data.

Usage:
    python init_database.py              # Initialize with default data
    python init_database.py --reset      # Reset and reinitialize all data
    python init_database.py --status     # Check current database status
"""

import os
import sys
import logging
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Now import our modules
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.database import Base, engine
from app.services.dynamic_data_service import DynamicDataService

# Import all models to ensure they're registered
from app.models import referral, dynamic_data, user, email_log

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_database_connection():
    """Check if we can connect to the