#!/usr/bin/env python3
"""
Create users table and add sample users for testing
"""

import sys
from pathlib import Path
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
load_dotenv()

from app.models.user import User, UserRole, ServiceType
from app.services.auth_service import AuthService
from app.core.database import Base

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ndis_user:ndis_user2025@localhost:5432/NDIS")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Create all tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")

def create_sample_users():
    """Create sample users for testing"""
    print("Creating sample users...")
    
    auth_service = AuthService()
    db = SessionLocal()
    
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == "admin@ndis-system.com").first()
        if existing_admin:
            print("Admin user already exists, skipping creation...")
            return
        
        # Create admin user
        admin_user = User(
            email="admin@ndis-system.com",
            hashed_password=auth_service.hash_password("admin123"),
            first_name="System",
            last_name="Administrator",
            phone_number="+61 2 1234 5678",
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True
        )
        db.add(admin_user)
        
        # Create sample providers
        providers = [
            {
                "email": "physio@compass-clinic.com",
                "password": "physio123",
                "first_name": "Sarah",
                "last_name": "Johnson",
                "phone_number": "+61 400 111 222",
                "role": UserRole.PROVIDER,
                "service_type": ServiceType.PHYSIOTHERAPY,
                "provider_license": "PHYSIO001",
                "provider_agency": "Compass Physiotherapy Clinic"
            },
            {
                "email": "chiro@compass-clinic.com", 
                "password": "chiro123",
                "first_name": "Michael",
                "last_name": "Chen",
                "phone_number": "+61 400 333 444",
                "role": UserRole.PROVIDER,
                "service_type": ServiceType.CHIRO,
                "provider_license": "CHIRO001",
                "provider_agency": "Compass Chiropractic Clinic"
            },
            {
                "email": "psych@compass-clinic.com",
                "password": "psych123", 
                "first_name": "Emma",
                "last_name": "Williams",
                "phone_number": "+61 400 555 666",
                "role": UserRole.PROVIDER,
                "service_type": ServiceType.PSYCHOLOGY,
                "provider_license": "PSYCH001",
                "provider_agency": "Compass Psychology Services"
            },
            {
                "email": "general@compass-clinic.com",
                "password": "general123",
                "first_name": "David",
                "last_name": "Brown", 
                "phone_number": "+61 400 777 888",
                "role": UserRole.PROVIDER,
                "service_type": ServiceType.ALL,
                "provider_license": "GEN001",
                "provider_agency": "Compass Health Services"
            }
        ]
        
        for provider_data in providers:
            provider = User(
                email=provider_data["email"],
                hashed_password=auth_service.hash_password(provider_data["password"]),
                first_name=provider_data["first_name"],
                last_name=provider_data["last_name"],
                phone_number=provider_data["phone_number"],
                role=provider_data["role"],
                service_type=provider_data["service_type"],
                provider_license=provider_data["provider_license"],
                provider_agency=provider_data["provider_agency"],
                is_active=True,
                is_verified=True
            )
            db.add(provider)
        
        db.commit()
        print("✅ Sample users created successfully!")
        
        # Print login credentials
        print("\n📝 Sample Login Credentials:")
        print("=" * 40)
        print("Admin:")
        print("  Email: admin@ndis-system.com")
        print("  Password: admin123")
        print()
        print("Providers:")
        for provider_data in providers:
            print(f"  {provider_data['first_name']} {provider_data['last_name']} ({provider_data['service_type'].value}):")
            print(f"    Email: {provider_data['email']}")
            print(f"    Password: {provider_data['password']}")
            print()
        
    except Exception as e:
        print(f"❌ Error creating sample users: {str(e)}")
        db.rollback()
    finally:
        db.close()

def main():
    print("🚀 Setting up NDIS User System")
    print("=" * 40)
    
    try:
        # Create tables
        create_tables()
        
        # Create sample users
        create_sample_users()
        
        print("\n🎉 Setup completed successfully!")
        print("\nNext steps:")
        print("1. Start your FastAPI server: uvicorn app.main:app --reload")
        print("2. Test login with the credentials above")
        print("3. The email system will now use these provider emails")
        
    except Exception as e:
        print(f"❌ Setup failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()