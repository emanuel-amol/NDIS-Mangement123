import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv, find_dotenv


# Load variables from .env file (search upwards so root .env is found
# even when the working directory is backend/)
try:
    env_path = find_dotenv()
    if env_path:
        load_dotenv(env_path)
    else:
        load_dotenv()
except Exception:
    # Fall back silently if dotenv is unavailable in some environments
    pass


def _determine_database_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url

    base_dir = Path(__file__).resolve().parent
    sqlite_path = base_dir / "local.db"
    return f"sqlite:///{sqlite_path}"


DATABASE_URL = _determine_database_url()

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Engine (connection pool to PostgreSQL/SQLite)
engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base for ORM models
Base = declarative_base()


# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
