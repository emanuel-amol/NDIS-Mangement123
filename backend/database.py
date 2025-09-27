# updated_compatibility_test.py - Test the updated model
import sys
import os
sys.path.append('.')

def test_updated_user_creation():
    """Test user creation with the updated model"""
    print("🧪 Testing updated user creation...")
    
    try:
        from app.core.database import SessionLocal
        from app.models.user import User, UserRole
        from datetime import datetime
        import hashlib
        
        # Create database session
        db = SessionLocal()
        
        # Simple password hash function
        def simple_hash_password(password: str) -> str:
            return hashlib.sha256(password.encode()).hexdigest()
        
        # Create test user with updated model
        hashed_pw = simple_hash_password("testpassword123")
        test_user = User(
            email="updated.test@example.com",
            password_hash=hashed_pw,  # Primary password field
            hashed_password=hashed_pw,  # Secondary for compatibility
            first_name="Updated",
            last_name="Test",
            phone="1234567890",
            role=UserRole.support_worker,
            is_active=True,
            is_verified=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Check if user already exists
        existing = db.query(User).filter(User.email == test_user.email).first()
        if existing:
            print(f"⚠️ User {test_user.email} already exists, deleting first...")
            db.delete(existing)
            db.commit()
        
        # Add new user
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        
        print(f"✅ User created successfully!")
        print(f"   ID: {test_user.id}")
        print(f"   Email: {test_user.email}")
        print(f"   Name: {test_user.first_name} {test_user.last_name}")
        print(f"   Phone: {test_user.phone}")
        print(f"   Role: {test_user.role.value}")
        print(f"   Password Hash: {test_user.password_hash[:20]}...")
        print(f"   Hashed Password: {test_user.hashed_password[:20]}...")
        
        # Test the phone_number property
        print(f"   Phone (via property): {test_user.phone_number}")
        
        # Test setting phone via property
        test_user.phone_number = "9876543210"
        print(f"   Phone after property set: {test_user.phone}")
        
        # Clean up
        db.delete(test_user)
        db.commit()
        print("✅ Test user cleaned up")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Updated user creation failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_model_compatibility_again():
    """Test model compatibility with the updated model"""
    print("\n🧪 Testing updated model compatibility...")
    
    try:
        from app.models.user import User
        from sqlalchemy import inspect
        from app.core.database import engine
        
        # Get table columns from database
        inspector = inspect(engine)
        table_columns = set(col['name'] for col in inspector.get_columns('users'))
        print(f"📋 Database columns ({len(table_columns)}): {sorted(table_columns)}")
        
        # Get model attributes
        model_columns = set(col.name for col in User.__table__.columns)
        print(f"📋 Model columns ({len(model_columns)}): {sorted(model_columns)}")
        
        # Check for mismatches
        missing_in_db = model_columns - table_columns
        missing_in_model = table_columns - model_columns
        
        if missing_in_db:
            print(f"⚠️ Columns in model but not in database: {missing_in_db}")
        
        if missing_in_model:
            print(f"⚠️ Columns in database but not in model: {missing_in_model}")
        
        if not missing_in_db and not missing_in_model:
            print("✅ Model and database are perfectly compatible!")
            return True
        else:
            print("⚠️ Some mismatches found, but this might be okay")
            return len(missing_in_db) == 0  # Model can have missing columns from DB, but not vice versa
            
    except Exception as e:
        print(f"❌ Compatibility test failed: {e}")
        return False

def test_role_enum():
    """Test that role enum works correctly"""
    print("\n🧪 Testing role enum...")
    
    try:
        from app.models.user import UserRole
        
        # Test all role values
        roles = ["admin", "service_provider_admin", "coordinator", "support_worker", "viewer"]
        
        for role_name in roles:
            try:
                role = UserRole(role_name)
                print(f"✅ Role '{role_name}' -> {role.value}")
            except ValueError as e:
                print(f"❌ Role '{role_name}' failed: {e}")
                return False
        
        print("✅ All roles work correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Role enum test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Updated User Model Tests\n")
    
    # Test model compatibility first
    model_ok = test_model_compatibility_again()
    
    # Test role enum
    role_ok = test_role_enum()
    
    if model_ok and role_ok:
        # Test direct user creation
        creation_ok = test_updated_user_creation()
        
        if creation_ok:
            print("\n🎉 All tests passed!")
            print("✅ The updated user model should work perfectly with the API")
            print("\n💡 Now start the server and test:")
            print("   1. uvicorn app.main:app --reload")
            print("   2. Go to http://localhost:5173/admin/users")
            print("   3. Click 'Add User' and fill in the form")
        else:
            print("\n❌ User creation test failed")
    else:
        print("\n❌ Compatibility or role tests failed")