from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Generate a new hash for "Test123!"
new_hash = pwd_context.hash("Test123!")
print(f"New hash: {new_hash}")

# Verify it works
verify_result = pwd_context.verify("Test123!", new_hash)
print(f"Verification: {verify_result}")