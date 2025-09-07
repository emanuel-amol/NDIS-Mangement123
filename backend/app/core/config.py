# backend/app/core/config.py - Updated configuration
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database - Your existing PostgreSQL
    DATABASE_URL: str
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "NDIS"
    DB_USER: str = "postgres"
    DB_PASSWORD: str
    
    # Supabase (for visualization only - same database)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Application
    APP_NAME: str = "NDIS Management System"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Optional: Supabase client for analytics/reporting
if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
    try:
        from supabase import create_client, Client
        supabase_client: Client = create_client(
            settings.SUPABASE_URL, 
            settings.SUPABASE_SERVICE_ROLE_KEY
        )
    except ImportError:
        supabase_client = None
        print("Supabase client not available - install with: pip install supabase")
else:
    supabase_client = None