# backend/app/core/database.py - FIXED VERSION WITHOUT CIRCULAR IMPORT
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root - handle different ways the app might be started
current_dir = Path(__file__).parent
backend_dir = current_dir.parent.parent.parent  # Go up from app/core/ to backend/
project_root = backend_dir.parent  # Go up from backend/ to project root

env_paths = [
    project_root / '.env',  # Project root
    backend_dir / '.env',   # Backend directory
    Path.cwd() / '.env',    # Current working directory
]

# Try to find and load .env file
env_loaded = False
for env_path in env_paths:
    if env_path.exists():
        print(f"Loading .env from: {env_path}")
        load_dotenv(dotenv_path=env_path)
        env_loaded = True
        break

if not env_loaded:
    print("Warning: .env file not found in any expected location")
    print(f"Searched in: {[str(p) for p in env_paths]}")

# PostgreSQL DATABASE_URL - REQUIRED!
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print(f"Current working directory: {Path.cwd()}")
    print(f"Script location: {Path(__file__).parent}")
    print(f"Searched for .env in: {[str(p) for p in env_paths]}")
    print(f"Available env vars starting with DATABASE: {[k for k in os.environ.keys() if k.startswith('DATABASE')]}")
    
    raise ValueError(
        "DATABASE_URL environment variable is required! "
        "Please set it in your .env file in the project root. "
        f"Expected locations: {[str(p) for p in env_paths]}"
    )

print(f"Connected to database: {DATABASE_URL.split('@')[0]}@***")  # Hide password in logs

# Create engine for PostgreSQL
engine = create_engine(DATABASE_URL, echo=False)  # Set to True for SQL debugging

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    print("Creating database tables...")
    try:
        print("Connecting to database...")
        
        # REMOVED THE PROBLEMATIC IMPORTS THAT CAUSE CIRCULAR DEPENDENCY
        # The models will be imported when needed by SQLAlchemy's create_all
        
        # Import models in a way that doesn't cause circular imports
        # Import base model first
        from app.models import referral, participant, care_plan, document
        
        print("All models imported successfully")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        
    except Exception as e:
        print(f"Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        raise