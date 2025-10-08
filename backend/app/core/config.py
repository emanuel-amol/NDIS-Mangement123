# backend/app/core/config.py - WITH AI SETTINGS
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration settings loaded from environment variables."""
    
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

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()