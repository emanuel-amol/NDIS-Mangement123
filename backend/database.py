# backend/app/dependencies.py
"""
Dependency injection functions for FastAPI endpoints
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from typing import Generator

def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    Yields a database session and ensures it's closed after use.
    
    Usage in FastAPI endpoints:
        @router.get("/endpoint")
        def my_endpoint(db: Session = Depends(get_db)):
            # Use db here
            pass
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()