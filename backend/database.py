#!/usr/bin/env python3
"""
Script to check and fix the participant status column
"""

import psycopg2
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'ndis_db',
    'user': 'postgres',
    'password': 'CyberSecurityGroup1'
}

def check_and_fix_status():
    """Check what type the status column is and fix it"""
    try:
        logger.info("Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check the current status column type
        cursor.execute("""
            SELECT column_name, data_type, udt_name
            FROM information_schema.columns 
            WHERE table_name = 'participants' AND column_name = 'status'
        """)
        
        result = cursor.fetchone()
        if not result:
            logger.error("Status column not found!")
            return False
            
        col_name, data_type, udt_name = result
        logger.info(f"Status column: {col_name}, type: {data_type}, udt_name: {udt_name}")
        
        # Check what values are currently in the status column
        cursor.execute("SELECT DISTINCT status FROM participants WHERE status IS NOT NULL")
        current_statuses = [row[0] for row in cursor.fetchall()]
        logger.info(f"Current status values in database: {current_statuses}")
        
        # If it's using an enum that doesn't exist, or if we have 'onboarded' status
        if 'onboarded' in current_statuses:
            logger.info("Found 'onboarded' status values. Need to fix this...")
            
            # Convert to VARCHAR to allow any status
            logger.info("Converting status column to VARCHAR to allow all status values...")
            cursor.execute("ALTER TABLE participants ALTER COLUMN status TYPE VARCHAR(50)")
            
            conn.commit()
            logger.info("✅ Successfully converted status column to VARCHAR")
            
            # Verify the change
            cursor.execute("""
                SELECT column_name, data_type, udt_name
                FROM information_schema.columns 
                WHERE table_name = 'participants' AND column_name = 'status'
            """)
            result = cursor.fetchone()
            logger.info(f"Updated status column: {result}")
            
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        logger.error(f"Error: {e}")
        if 'conn' in locals():
            conn.rollback()
        return False

def main():
    logger.info("🔧 Checking and fixing participant status column...")
    
    success = check_and_fix_status()
    
    if success:
        print("\n🎉 SUCCESS! Status column should now work with all values.")
        print("Restart your FastAPI server and try the participants endpoint.")
    else:
        print("\n❌ FAILED! Check the logs above.")

if __name__ == "__main__":
    main()