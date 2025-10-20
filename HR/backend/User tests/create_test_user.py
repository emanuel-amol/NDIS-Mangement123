from app.database import get_db
from app import models, crud
from app.schemas import UserCreate

db = next(get_db())

# Create a test user with a known password
test_email = "admin@test.com"
test_password = "admin123"

# Check if user already exists
existing_user = crud.get_user_by_email(db, test_email)
if existing_user:
    print(f"Updating password for existing user: {existing_user.username}")
    # Update the password
    existing_user.hashed_password = crud.get_password_hash(test_password)
    db.add(existing_user)
    db.commit()
    print(f"Password updated for {existing_user.username}")
else:
    print("Creating new test user...")
    # Create new user
    user_data = UserCreate(username="admin", email=test_email, password=test_password)
    new_user = crud.create_user(db, user_data)
    print(f"Created new user: {new_user.username} ({new_user.email})")

print(f"\nTest login credentials:")
print(f"Email: {test_email}")
print(f"Password: {test_password}")

# Verify the password works
test_user = crud.get_user_by_email(db, test_email)
if test_user:
    is_valid = crud.verify_password(test_password, test_user.hashed_password)
    print(f"Password verification test: {is_valid}")
    
    # Also create a candidate record if needed
    candidate = db.query(models.Candidate).filter(models.Candidate.user_id == test_user.id).first()
    if not candidate:
        candidate = models.Candidate(
            first_name="Admin",
            last_name="User", 
            email=test_email,
            job_title="Administrator",
            mobile="",
            status="Hired",
            user_id=test_user.id
        )
        db.add(candidate)
        db.commit()
        print("Created candidate record for test user")
    else:
        print("Candidate record already exists")