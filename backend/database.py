#!/usr/bin/env python3
# backend/run_enhanced_seeding.py - Standalone script to run enhanced dynamic data seeding

import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def run_seeding():
    """Run the enhanced dynamic data seeding"""
    try:
        # Import database connection
        from app.core.database import SessionLocal
        
        # Import seeding functions
        from app.services.enhanced_seed_dynamic_data import run_complete_seeding
        
        print("🚀 Starting Enhanced Dynamic Data Seeding...")
        print("This will populate care plan and risk assessment dynamic data")
        print("=" * 80)
        
        # Check if .env file exists
        env_files = [
            backend_dir / '.env',
            backend_dir.parent / '.env',
            Path.cwd() / '.env'
        ]
        
        env_found = False
        for env_file in env_files:
            if env_file.exists():
                print(f"✅ Found .env file: {env_file}")
                env_found = True
                break
        
        if not env_found:
            print("⚠️  Warning: No .env file found. Make sure DATABASE_URL is set.")
        
        # Create database session
        db = SessionLocal()
        
        try:
            # Test database connection
            from sqlalchemy import text
            db.execute(text("SELECT 1"))
            print("✅ Database connection successful")
            
            # Run the complete seeding
            run_complete_seeding(db)
            
            print("\n🎉 Enhanced seeding completed successfully!")
            print("🔧 Your NDIS Management System now has:")
            print("  ✅ Dynamic Care Plan components")
            print("  ✅ Dynamic Risk Assessment components")
            print("  ✅ NDIS-compliant service definitions")
            print("  ✅ Admin-configurable options")
            
        finally:
            db.close()
            print("\n🔒 Database connection closed")
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're running this from the backend directory")
        print("and all dependencies are installed (pip install -r requirements.txt)")
        sys.exit(1)
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        print("\nTroubleshooting:")
        print("1. Check your DATABASE_URL in .env file")
        print("2. Ensure PostgreSQL is running")
        print("3. Verify database tables exist (run: python create_tables.py)")
        print("4. Check that dynamic_data table exists")
        sys.exit(1)

def show_summary():
    """Show what will be seeded without running it"""
    try:
        from app.services.enhanced_seed_dynamic_data import get_enhanced_seed_summary
        
        print("📊 ENHANCED DYNAMIC DATA SEEDING SUMMARY")
        print("=" * 50)
        
        summary = get_enhanced_seed_summary()
        
        print(f"Total new data types: {summary['total_types']}")
        print(f"Total new entries: {summary['total_entries']}")
        print()
        
        print("📋 CARE PLAN TYPES:")
        for data_type in summary['care_plan_types']:
            count = summary['entries_per_type'][data_type]
            print(f"  • {data_type}: {count} options")
        
        print("\n🛡️  RISK ASSESSMENT TYPES:")
        for data_type in summary['risk_assessment_types']:
            count = summary['entries_per_type'][data_type]
            print(f"  • {data_type}: {count} options")
        
        print(f"\n🔧 Metadata coverage: {summary['metadata_coverage']['types_with_metadata']} types")
        print("=" * 50)
        
    except ImportError as e:
        print(f"❌ Cannot show summary: {e}")
        print("Make sure you're in the backend directory")

def main():
    """Main entry point"""
    print("🌱 NDIS Management System - Enhanced Dynamic Data Seeding")
    print("=" * 60)
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "summary":
            show_summary()
            return
        elif command == "help":
            print("Usage:")
            print("  python run_enhanced_seeding.py           # Run the seeding")
            print("  python run_enhanced_seeding.py summary   # Show what will be seeded")
            print("  python run_enhanced_seeding.py help      # Show this help")
            return
        else:
            print(f"❌ Unknown command: {command}")
            print("Run 'python run_enhanced_seeding.py help' for usage")
            return
    
    # Default action: run seeding
    confirmation = input("\n⚠️  This will add enhanced dynamic data to your database.\nContinue? (y/N): ")
    
    if confirmation.lower() in ['y', 'yes']:
        run_seeding()
    else:
        print("❌ Seeding cancelled")
        print("💡 Run 'python run_enhanced_seeding.py summary' to see what would be added")

if __name__ == "__main__":
    main()