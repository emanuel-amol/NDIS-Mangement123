# backend/app/core/config.py - COMPLETE WITH RAG SETTINGS
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/ndis_db")
    
    # IBM Cloud Object Storage Settings
    IBM_COS_API_KEY: str = os.getenv("IBM_COS_API_KEY", "")
    IBM_COS_SERVICE_INSTANCE_ID: str = os.getenv("IBM_COS_SERVICE_INSTANCE_ID", "")
    IBM_COS_ENDPOINT: str = os.getenv("IBM_COS_ENDPOINT", "")
    IBM_COS_BUCKET_NAME: str = os.getenv("IBM_COS_BUCKET_NAME", "")
    IBM_IAM_AUTH_URL: str = os.getenv("IBM_IAM_AUTH_URL", "https://iam.cloud.ibm.com/identity/token")
    
    # COS Upload Configuration
    COS_MAX_UPLOAD_MB: int = int(os.getenv("COS_MAX_UPLOAD_MB", "50"))
    
    # Admin Authentication
    ADMIN_API_KEY: str | None = os.getenv("ADMIN_API_KEY")
    
    # AI Configuration
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "watsonx")
    AI_MODEL: str = os.getenv("AI_MODEL", "ibm/granite-3-8b-instruct")
    
    # Embeddings Configuration
    EMBEDDINGS_PROVIDER: str = os.getenv("EMBEDDINGS_PROVIDER", "watsonx")
    EMBEDDINGS_MODEL: str = os.getenv("EMBEDDINGS_MODEL", "ibm/slate-125m-english-rtrvr")
    
    # Watsonx AI Settings
    WATSONX_URL: str = os.getenv("WATSONX_URL", "")
    WATSONX_API_KEY: str = os.getenv("WATSONX_API_KEY", "")
    WATSONX_PROJECT_ID: str = os.getenv("WATSONX_PROJECT_ID", "")
    WATSONX_MODEL_ID: str = os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-8b-instruct")
    WATSONX_DECODING_METHOD: str = os.getenv("WATSONX_DECODING_METHOD", "greedy")
    WATSONX_MAX_NEW_TOKENS: int = int(os.getenv("WATSONX_MAX_NEW_TOKENS", "512"))
    WATSONX_TEMPERATURE: float = float(os.getenv("WATSONX_TEMPERATURE", "0.2"))
    
    # RAG Configuration - NEW SETTINGS
    AUTO_PROCESS_DOCUMENTS: bool = os.getenv("AUTO_PROCESS_DOCUMENTS", "true").lower() == "true"
    RAG_CHUNK_SIZE: int = int(os.getenv("RAG_CHUNK_SIZE", "500"))
    RAG_CHUNK_OVERLAP: int = int(os.getenv("RAG_CHUNK_OVERLAP", "50"))
    RAG_MIN_CHUNK_SIZE: int = int(os.getenv("RAG_MIN_CHUNK_SIZE", "100"))
    RAG_MAX_CONTEXT_LENGTH: int = int(os.getenv("RAG_MAX_CONTEXT_LENGTH", "2000"))
    RAG_TOP_K_RESULTS: int = int(os.getenv("RAG_TOP_K_RESULTS", "5"))
    RAG_SIMILARITY_THRESHOLD: float = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.5"))
    
    # Email Configuration
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "")
    ADMIN_NOTIFICATION_EMAIL: str = os.getenv("ADMIN_NOTIFICATION_EMAIL", "")
    
    # CORS Configuration
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    
    # App Configuration
    APP_ENV: str = os.getenv("APP_ENV", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    
    @property
    def is_cos_configured(self) -> bool:
        """Return True when the required IBM COS configuration values are present."""
        required_values = [
            self.IBM_COS_API_KEY,
            self.IBM_COS_SERVICE_INSTANCE_ID,
            self.IBM_COS_ENDPOINT,
            self.IBM_COS_BUCKET_NAME,
            self.IBM_IAM_AUTH_URL,
        ]

        if any(not value or not value.strip() for value in required_values):
            return False

        if any("REPLACE_WITH" in value.upper() for value in required_values):
            return False

        placeholder_buckets = {
            "your-bucket-name",
            "your_bucket_name",
            "example-bucket",
            "bucket-name",
            "replace_with_cos_bucket",
            "replace-with-cos-bucket",
            "replace_with_your_cos_bucket",
        }

        bucket_name = self.IBM_COS_BUCKET_NAME.strip().lower()
        if bucket_name in placeholder_buckets:
            return False

        return True
    
    @property
    def is_ai_configured(self) -> bool:
        """Return True when AI (Watsonx) is properly configured."""
        if self.AI_PROVIDER == "watsonx":
            return bool(
                self.WATSONX_URL and 
                self.WATSONX_API_KEY and 
                self.WATSONX_PROJECT_ID and
                not any("REPLACE" in str(v).upper() for v in [
                    self.WATSONX_URL, 
                    self.WATSONX_API_KEY, 
                    self.WATSONX_PROJECT_ID
                ])
            )
        return False
    
    @property
    def is_embeddings_configured(self) -> bool:
        """Return True when embeddings (Watsonx) are properly configured."""
        # Embeddings use same Watsonx credentials as main AI
        return self.is_ai_configured
    
    @property
    def cors_origins_list(self) -> list:
        """Return CORS origins as a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()