# backend/init_db.py
import pkgutil
import importlib
from sqlalchemy import text
from app.core.database import engine, SessionLocal, Base

def ensure_schema():
    # safe if it already exists
    with engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS participants"))

def import_all_models():
    """
    Import everything in app.models so SQLAlchemy sees all tables
    (participants, dynamic_data, etc.).
    """
    import app.models as models_pkg
    for _, modname, ispkg in pkgutil.iter_modules(models_pkg.__path__):
        if not ispkg:
            importlib.import_module(f"{models_pkg.__name__}.{modname}")

def create_tables():
    Base.metadata.create_all(bind=engine)

def seed_minimum_data():
    """
    Your app looked for dynamic_data(type='contact_methods', code='PHONE').
    Insert it if missing so startup/API calls don’t explode.
    """
    with SessionLocal() as db:
        # dynamic_data table may be in the default 'participants' schema
        # thanks to search_path. Use a portable upsert-like approach.
        exists = db.execute(
            text("""
                SELECT 1
                FROM dynamic_data
                WHERE type=:t AND code=:c
                LIMIT 1
            """),
            {"t": "contact_methods", "c": "PHONE"},
        ).first()
        if not exists:
            db.execute(
                text("""
                    INSERT INTO dynamic_data (type, code, label, is_active, meta, created_at, updated_at)
                    VALUES (:t, :c, :l, true, '{}'::jsonb, now(), now())
                """),
                {"t": "contact_methods", "c": "PHONE", "l": "Phone"},
            )
            db.commit()

def main():
    print("[init_db] Ensuring schema...")
    ensure_schema()
    print("[init_db] Importing models...")
    import_all_models()
    print("[init_db] Creating tables...")
    create_tables()
    print("[init_db] Seeding minimum lookup rows...")
    seed_minimum_data()
    print("[init_db] Done.")

if __name__ == "__main__":
    main()
