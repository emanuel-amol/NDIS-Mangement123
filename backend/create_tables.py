#!/usr/bin/env python3

import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from app.core.database import Base

# Import all models so they are registered with SQLAlchemy
from app.models.referral import Referral

def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("[SUCCESS] Tables created successfully!")
        print("[INFO] Tables created:")
        print("  - referrals")
    except Exception as e:
        print(f"[ERROR] Error creating tables: {e}")
        return False
    return True

if __name__ == "__main__":
    create_tables()