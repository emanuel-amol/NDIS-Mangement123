# backend/app/core/config.py (add these lines)
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... your existing settings ...
    ADMIN_API_KEY: str | None = os.getenv("ADMIN_API_KEY")

settings = Settings()
