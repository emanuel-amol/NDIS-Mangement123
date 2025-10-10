"""Fix the userrole enum to include all required values"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from project root
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"Loaded .env from: {env_path}")
else:
    print(f"WARNING: .env not found at {env_path}")

DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found in environment")
    exit(1)

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)

# Required role values
required_roles = ['admin', 'service_provider_admin', 'coordinator', 'support_worker', 'viewer']

with engine.connect() as conn:
    # First, check what values currently exist
    print("\nChecking current enum values...")
    result = conn.execute(text("SELECT unnest(enum_range(NULL::userrole))::text"))
    existing_roles = [row[0] for row in result]
    print(f"Existing roles: {existing_roles}")

    # Add missing roles
    print("\nAdding missing role values...")
    for role in required_roles:
        if role not in existing_roles:
            try:
                conn.execute(text(f"ALTER TYPE userrole ADD VALUE '{role}'"))
                conn.commit()
                print(f"✓ Added role: {role}")
            except Exception as e:
                print(f"✗ Failed to add role '{role}': {e}")
        else:
            print(f"- Role already exists: {role}")

    # Verify final state
    print("\nFinal enum values:")
    result = conn.execute(text("SELECT unnest(enum_range(NULL::userrole))::text"))
    final_roles = [row[0] for row in result]
    print(f"All roles: {final_roles}")

print("\n✓ Database enum updated successfully!")
