# backend/migrate_dynamic_data.py
"""
Migration script to add dynamic data functionality to existing NDIS database
Run this after updating your codebase to add dynamic data tables and default data
"""

import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import SessionLocal, engine, Base
from app.services.dynamic_data_service import DynamicDataService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_tables_exist():
    """Check if dynamic data tables already exist"""
    try:
        with engine.connect() as conn:
            # Check if data_types table exists
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('data_types', 'data_points')
            """))
            existing_tables = [row[0] for row in result]
            return 'data_types' in existing_tables, 'data_points' in existing_tables
    except Exception as e:
        logger.error(f"Error checking tables: {e}")
        return False, False

def create_dynamic_data_tables():
    """Create dynamic data tables"""
    try:
        logger.info("Creating dynamic data tables...")
        
        # Import models to register them with SQLAlchemy
        from app.models.dynamic_data import DataType, DataPoint
        
        # Create only the dynamic data tables
        DataType.__table__.create(engine, checkfirst=True)
        DataPoint.__table__.create(engine, checkfirst=True)
        
        logger.info("Dynamic data tables created successfully")
        return True
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        return False

def migrate_database():
    """Main migration function"""
    logger.info("Starting dynamic data migration...")
    
    try:
        # Check current state
        data_types_exist, data_points_exist = check_tables_exist()
        
        if data_types_exist and data_points_exist:
            logger.info("Dynamic data tables already exist")
        else:
            logger.info("Dynamic data tables not found, creating them...")
            if not create_dynamic_data_tables():
                return False
        
        # Initialize default data
        db = SessionLocal()
        try:
            # Check if default data already exists
            existing_types = DynamicDataService.get_data_types(db, active_only=False)
            
            if existing_types:
                logger.info(f"Found {len(existing_types)} existing data types")
                
                # Show what exists
                for data_type in existing_types:
                    points = DynamicDataService.get_data_points_by_type_id(
                        db, str(data_type.id), active_only=False
                    )
                    logger.info(f"  - {data_type.display_name}: {len(points)} points")
                
                response = input("Do you want to reinitialize default data? (y/N): ")
                if response.lower().strip() in ['y', 'yes']:
                    logger.info("Clearing and reinitializing default data...")
                    
                    # Clear existing data
                    db.query(DataPoint).delete()
                    db.commit()
                    db.query(DataType).delete() 
                    db.commit()
                    
                    # Reinitialize
                    DynamicDataService.initialize_default_data_types(db)
                    logger.info("Default data reinitialized")
                else:
                    logger.info("Keeping existing data")
            else:
                logger.info("No existing data types found, initializing defaults...")
                DynamicDataService.initialize_default_data_types(db)
                logger.info("Default data types and points initialized")
            
            # Final summary
            data_types = DynamicDataService.get_data_types(db, active_only=False)
            total_points = 0
            
            logger.info(f"\nMigration complete! Summary:")
            logger.info(f"Total data types: {len(data_types)}")
            
            for data_type in data_types:
                points = DynamicDataService.get_data_points_by_type_id(
                    db, str(data_type.id), active_only=False
                )
                total_points += len(points)
                logger.info(f"  - {data_type.display_name}: {len(points)} points")
            
            logger.info(f"Total data points: {total_points}")
            
        except Exception as e:
            logger.error(f"Error initializing data: {e}")
            db.rollback()
            return False
        finally:
            db.close()
        
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return False

def verify_migration():
    """Verify that migration was successful"""
    logger.info("Verifying migration...")
    
    try:
        db = SessionLocal()
        try:
            # Test basic operations
            data_types = DynamicDataService.get_data_types(db)
            logger.info(f"✓ Can fetch data types: {len(data_types)} found")
            
            # Test fetching points for a common type
            disability_points = DynamicDataService.get_data_points_by_type_name(
                db, "disability_types"
            )
            logger.info(f"✓ Can fetch disability types: {len(disability_points)} found")
            
            service_points = DynamicDataService.get_data_points_by_type_name(
                db, "service_types"
            )
            logger.info(f"✓ Can fetch service types: {len(service_points)} found")
            
            logger.info("✓ Migration verification successful!")
            return True
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"✗ Migration verification failed: {e}")
        return False

if __name__ == "__main__":
    logger.info("NDIS Dynamic Data Migration Tool")
    logger.info("=" * 50)
    
    # Run migration
    if migrate_database():
        logger.info("Migration completed successfully!")
        
        # Verify migration
        if verify_migration():
            logger.info("\n🎉 Migration and verification complete!")
            logger.info("Your NDIS system now supports dynamic data management.")
            logger.info("\nNext steps:")
            logger.info("1. Restart your FastAPI server")
            logger.info("2. Check the /api/v1/dynamic-data/status endpoint")
            logger.info("3. Visit /docs to see the new dynamic data API endpoints")
        else:
            logger.error("Migration completed but verification failed")
            sys.exit(1)
    else:
        logger.error("Migration failed")
        sys.exit(1)