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
    
    # COS Upload Configuration (keys are built dynamically per entity)
    COS_MAX_UPLOAD_MB: int = int(os.getenv("COS_MAX_UPLOAD_MB", "50"))
    
    # Admin Authentication
    ADMIN_API_KEY: str | None = os.getenv("ADMIN_API_KEY")
    
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

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
