# create_roster_tables.py
# Run this script to create the missing roster tables

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.database import Base, DATABASE_URL
from app.models.roster import Roster, RosterParticipant, RosterTask, RosterWorkerNote, RosterRecurrence, RosterInstance, RosterStatusHistory
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_roster_tables():
    """Create all roster-related tables"""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Import all models to ensure they're registered
        from app.models import roster, user, participant
        
        logger.info("Creating roster tables...")
        
        # Create only the roster tables
        roster_tables = [
            Roster.__table__,
            RosterParticipant.__table__,
            RosterTask.__table__,
            RosterWorkerNote.__table__,
            RosterRecurrence.__table__,
            RosterInstance.__table__,
            RosterStatusHistory.__table__
        ]
        
        # Create tables
        for table in roster_tables:
            table.create(engine, checkfirst=True)
            logger.info(f"✅ Created table: {table.name}")
        
        # Verify tables were created
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                    AND table_name LIKE 'roster%'
                ORDER BY table_name
            """))
            
            tables = [row[0] for row in result]
            logger.info(f"✅ Roster tables created: {tables}")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating roster tables: {e}")
        return False

def verify_roster_tables():
    """Verify that all roster tables exist"""
    try:
        engine = create_engine(DATABASE_URL)
        
        expected_tables = [
            'rosters',
            'roster_participants', 
            'roster_tasks',
            'roster_worker_notes',
            'roster_recurrences',
            'roster_instances',
            'roster_status_history'
        ]
        
        with engine.connect() as conn:
            for table_name in expected_tables:
                result = conn.execute(text(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = '{table_name}'
                    );
                """))
                
                exists = result.scalar()
                status = "✅" if exists else "❌"
                logger.info(f"{status} Table '{table_name}': {'EXISTS' if exists else 'MISSING'}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error verifying tables: {e}")
        return False

if __name__ == "__main__":
    logger.info("🚀 Starting roster tables creation...")
    
    # First verify what's missing
    logger.info("📋 Checking current table status...")
    verify_roster_tables()
    
    # Create the tables
    logger.info("🔨 Creating missing roster tables...")
    success = create_roster_tables()
    
    if success:
        logger.info("✅ Roster tables creation completed!")
        
        # Verify again
        logger.info("🔍 Verifying tables were created...")
        verify_roster_tables()
        
        logger.info("🎉 All done! You can now restart your FastAPI server.")
    else:
        logger.error("❌ Failed to create roster tables. Check the error messages above.")
        sys.exit(1)