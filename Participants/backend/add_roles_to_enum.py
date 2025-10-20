from app.core.database import engine
from sqlalchemy import text

roles_to_add = ['manager', 'support_worker', 'coordinator', 'viewer']

with engine.connect() as conn:
    # Get existing roles
    result = conn.execute(text("SELECT unnest(enum_range(NULL::userrole))::text"))
    existing = [r[0] for r in result]
    print(f"Existing roles: {existing}")

    # Add missing roles
    for role in roles_to_add:
        if role not in existing:
            try:
                conn.execute(text(f"ALTER TYPE userrole ADD VALUE '{role}'"))
                conn.commit()
                print(f"✓ Added: {role}")
            except Exception as e:
                print(f"✗ Failed to add {role}: {e}")
        else:
            print(f"- Already exists: {role}")

    # Verify final state
    result = conn.execute(text("SELECT unnest(enum_range(NULL::userrole))::text"))
    final = [r[0] for r in result]
    print(f"\nFinal roles: {final}")
