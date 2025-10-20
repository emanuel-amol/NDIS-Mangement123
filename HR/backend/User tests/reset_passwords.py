from app.database import get_db
from app import models, crud

db = next(get_db())

def reset_user_password(email: str, new_password: str):
    """Reset a user's password"""
    user = crud.get_user_by_email(db, email)
    if not user:
        print(f"User with email {email} not found")
        return False
    
    # Update password
    user.hashed_password = crud.get_password_hash(new_password)
    db.add(user)
    db.commit()
    
    print(f"Password reset for {user.username} ({user.email})")
    
    # Verify the new password works
    is_valid = crud.verify_password(new_password, user.hashed_password)
    print(f"Password verification test: {is_valid}")
    return True

# Reset passwords for some of your existing users
users_to_reset = [
    ("Test@gmail.com", "test123"),
    ("orlichj@outlook.com", "student123"),
    ("admin@test.com", "admin123")  # This is our new test user
]

print("Resetting passwords for existing users...\n")

for email, password in users_to_reset:
    print(f"Resetting password for {email}...")
    success = reset_user_password(email, password)
    if success:
        print(f"✓ New password: {password}")
    print("-" * 40)