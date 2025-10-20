#!/usr/bin/env python
"""
Migration script to make due_date column nullable in invoices table
"""
from app.core.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Make due_date column nullable
        conn.execute(text('ALTER TABLE invoices ALTER COLUMN due_date DROP NOT NULL'))
        conn.commit()
        print('Column due_date is now nullable')

if __name__ == "__main__":
    migrate()
