#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Database migration script to create the xero_tokens table.

This script will:
1. Connect to your database
2. Create the xero_tokens table if it doesn't exist
3. Create necessary indexes

Usage:
    python backend/migrate_xero_tokens.py
"""

import sys
import os
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform.startswith('win'):
    os.system('chcp 65001 >nul 2>&1')
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.database import engine, Base
from app.models.xero_token import XeroToken

def run_migration():
    """Create the xero_tokens table in the database"""
    print("=" * 60)
    print("XERO TOKENS TABLE MIGRATION")
    print("=" * 60)

    try:
        print("\n1. Connecting to database...")
        print(f"   Database: {engine.url.database}")
        print(f"   Host: {engine.url.host}")

        print("\n2. Creating xero_tokens table...")

        # This will create ONLY the xero_tokens table if it doesn't exist
        # It won't affect existing tables
        XeroToken.__table__.create(bind=engine, checkfirst=True)

        print("   [OK] xero_tokens table created successfully!")

        print("\n3. Verifying table structure...")
        from sqlalchemy import inspect
        inspector = inspect(engine)

        if 'xero_tokens' in inspector.get_table_names():
            columns = inspector.get_columns('xero_tokens')
            print(f"   [OK] Table verified! Found {len(columns)} columns:")
            for col in columns:
                print(f"      - {col['name']}: {col['type']}")
        else:
            print("   [WARNING] Table not found after creation")
            return False

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nYour Xero tokens will now be:")
        print("  [+] Stored in the database")
        print("  [+] Encrypted at rest")
        print("  [+] Persistent across server restarts")
        print("  [+] Multi-tenant ready")
        print("\n")

        return True

    except Exception as e:
        print(f"\n[ERROR] during migration:")
        print(f"   {str(e)}")
        print("\nTroubleshooting:")
        print("  1. Make sure your database is running")
        print("  2. Check your DATABASE_URL in .env file")
        print("  3. Ensure you have CREATE TABLE permissions")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\nStarting database migration...\n")
    success = run_migration()
    sys.exit(0 if success else 1)
