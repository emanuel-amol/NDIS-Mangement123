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
    COS_DEFAULT_PREFIX: str = os.getenv("COS_DEFAULT_PREFIX", "tenant1/ndis")
    COS_MAX_UPLOAD_MB: int = int(os.getenv("COS_MAX_UPLOAD_MB", "50"))
    
    # Admin Authentication
    ADMIN_API_KEY: str | None = os.getenv("ADMIN_API_KEY")
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()