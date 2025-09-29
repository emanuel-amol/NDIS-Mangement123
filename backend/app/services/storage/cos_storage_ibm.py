# backend/app/services/storage/cos_storage_ibm.py
from ibm_botocore.client import Config
import ibm_boto3
import uuid, mimetypes
from urllib.parse import quote
from app.core.config import settings

def _cos():
    return ibm_boto3.client(
        "s3",
        ibm_api_key_id=settings.IBM_COS_API_KEY,
        ibm_service_instance_id=settings.IBM_COS_SERVICE_INSTANCE_ID,
        ibm_auth_endpoint=settings.IBM_IAM_AUTH_URL,
        config=Config(signature_version="oauth"),
        endpoint_url=settings.IBM_COS_ENDPOINT,
    )

def object_key(prefix: str, filename: str) -> str:
    """
    Creates IBM COS object key without tenant prefix.
    
    Examples:
        prefix='participants/14', filename='Care Plan.pdf'
        -> 'participants/14/Care Plan.pdf'
        
        prefix='referrals', filename='Referral Form.pdf'
        -> 'referrals/Referral Form.pdf'
    """
    safe_name = quote(filename, safe="")
    return f"{prefix.strip('/')}/{safe_name}"

def put_bytes(key: str, data: bytes, content_type: str | None = None):
    ct = content_type or mimetypes.guess_type(key)[0] or "application/octet-stream"
    _cos().put_object(Bucket=settings.IBM_COS_BUCKET_NAME, Key=key, Body=data, ContentType=ct)
    return {"bucket": settings.IBM_COS_BUCKET_NAME, "key": key, "content_type": ct}

def get_object_stream(key: str):
    return _cos().get_object(Bucket=settings.IBM_COS_BUCKET_NAME, Key=key)

def delete_object(key: str):
    _cos().delete_object(Bucket=settings.IBM_COS_BUCKET_NAME, Key=key)