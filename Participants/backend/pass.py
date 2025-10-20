from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User
from app.security.password import verify_password

# Create database session
db = SessionLocal()

# Find the user
user = db.query(User).filter(User.email == "participant@demo.io").first()

if user:
    print(f"✅ User found: {user.email}")
    print(f"📧 Email: {user.email}")
    print(f"👤 Name: {user.first_name} {user.last_name}")
    print(f"🔑 Role: {user.role}")
    print(f"✓ Active: {user.is_active}")
    print(f"✓ Verified: {user.is_verified}")
    print(f"🔐 Password hash: {user.password_hash[:50]}...")
    
    # Test password verification
    password = "Test123!"
    result = verify_password(password, user.password_hash)
    print(f"\n🔓 Password verification: {result}")
    
    if result:
        print("✅ PASSWORD MATCHES! Login should work.")
    else:
        print("❌ PASSWORD DOESN'T MATCH! Hash is wrong.")
else:
    print("❌ User not found!")

db.close()