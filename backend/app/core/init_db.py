# backend/app/core/init_db.py
"""
Database initialization script
Run this to set up the database with default data types and points
"""

import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.services.dynamic_data_service import DynamicDataService

# Import all models to ensure they're registered with SQLAlchemy
from app.models import referral, dynamic_data, user, email_log

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_database():
    """Initialize database with tables and default data"""
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Initialize default data types and points
        db = SessionLocal()
        try:
            logger.info("Initializing default data types and points...")
            DynamicDataService.initialize_default_data_types(db)
            logger.info("Default data initialized successfully")
            
            # Log summary of what was created
            data_types = DynamicDataService.get_data_types(db, active_only=False)
            logger.info(f"Total data types: {len(data_types)}")
            
            for data_type in data_types:
                points = DynamicDataService.get_data_points_by_type_id(
                    db, str(data_type.id), active_only=False
                )
                logger.info(f"  - {data_type.display_name}: {len(points)} points")
            
        except Exception as e:
            logger.error(f"Error initializing default data: {e}")
            db.rollback()
            raise
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

def reset_dynamic_data():
    """Reset dynamic data (useful for development)"""
    db = SessionLocal()
    try:
        logger.info("Clearing existing dynamic data...")
        
        # Delete all data points first (due to foreign key constraints)
        db.query(dynamic_data.DataPoint).delete()
        db.commit()
        
        # Delete all data types
        db.query(dynamic_data.DataType).delete()
        db.commit()
        
        logger.info("Existing dynamic data cleared")
        
        # Reinitialize with default data
        logger.info("Reinitializing default data...")
        DynamicDataService.initialize_default_data_types(db)
        logger.info("Default data reinitialized successfully")
        
    except Exception as e:
        logger.error(f"Error resetting dynamic data: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "reset":
        logger.info("Resetting dynamic data...")
        reset_dynamic_data()
    else:
        logger.info("Initializing database...")
        init_database()
    
    logger.info("Database initialization completed!")