# backend/app/schemas/document.py - COMPLETE DYNAMIC VERSION
from pydantic import BaseModel, validator, Field
from datetime import datetime
from typing import Optional, List, Dict, Any

class DocumentCategoryResponse(BaseModel):
    id: int
    category_id: str
    name: str
    description: Optional[str]
    is_required: bool
    sort_order: int
    is_active: bool
    config: Dict[str, Any]
    
    class Config:
        from_attributes = True

class DocumentUploadRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    category: str
    description: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = Field(default_factory=list)
    visible_to_support_worker: bool = False
    expiry_date: Optional[datetime] = None

    @validator('tags')
    def validate_tags(cls, v):
        if v:
            # Remove duplicates and empty strings
            cleaned_tags = list(set([tag.strip() for tag in v if tag.strip()]))
            if len(cleaned_tags) > 10:
                raise ValueError('Maximum 10 tags allowed')
            for tag in cleaned_tags:
                if len(tag) > 50:
                    raise ValueError('Tags must be 50 characters or less')
            return cleaned_tags
        return []

    @validator('expiry_date')
    def validate_expiry_date(cls, v):
        if v and v <= datetime.now():
            raise ValueError('Expiry date must be in the future')
        return v

class DocumentUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = None
    description: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = None
    visible_to_support_worker: Optional[bool] = None
    expiry_date: Optional[datetime] = None

    @validator('tags')
    def validate_tags(cls, v):
        if v is not None:
            cleaned_tags = list(set([tag.strip() for tag in v if tag.strip()]))
            if len(cleaned_tags) > 10:
                raise ValueError('Maximum 10 tags allowed')
            for tag in cleaned_tags:
                if len(tag) > 50:
                    raise ValueError('Tags must be 50 characters or less')
            return cleaned_tags
        return None

    @validator('expiry_date')
    def validate_expiry_date(cls, v):
        if v and v <= datetime.now():
            raise ValueError('Expiry date must be in the future')
        return v

class DocumentResponse(BaseModel):
    id: int
    participant_id: int
    title: str
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    category: str
    description: Optional[str]
    tags: List[str]
    version: int
    is_current_version: bool
    visible_to_support_worker: bool
    expiry_date: Optional[datetime]
    is_expired: bool
    status: str
    uploaded_by: str
    created_at: datetime
    updated_at: Optional[datetime]
    download_url: str

    @validator('is_expired', pre=False, always=True)
    def calculate_is_expired(cls, v, values):
        expiry_date = values.get('expiry_date')
        if expiry_date:
            return datetime.now() > expiry_date
        return False

    class Config:
        from_attributes = True

class DocumentStatsResponse(BaseModel):
    total_documents: int
    by_category: Dict[str, int]
    expired_documents: int
    expiring_soon: int  # Expiring within 30 days
    recent_uploads: int  # Uploaded in last 7 days

class DocumentSearchRequest(BaseModel):
    participant_id: Optional[int] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    is_expired: Optional[bool] = None
    visible_to_support_worker: Optional[bool] = None
    search_query: Optional[str] = Field(None, max_length=255)
    sort_by: Optional[str] = Field("created_at", pattern="^(created_at|title|category|expiry_date)$")
    sort_order: Optional[str] = Field("desc", pattern="^(asc|desc)$")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)

class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class DocumentTemplateResponse(BaseModel):
    id: int
    name: str
    category: str
    description: Optional[str]
    template_data: Dict[str, Any]
    is_active: bool
    requires_approval: bool
    created_at: datetime
    created_by: str

    class Config:
        from_attributes = True

class DocumentAccessResponse(BaseModel):
    id: int
    document_id: int
    user_id: int
    user_role: str
    access_type: str
    accessed_at: datetime
    ip_address: Optional[str]

    class Config:
        from_attributes = True

class BulkDocumentAction(BaseModel):
    document_ids: List[int] = Field(..., min_items=1, max_items=50)
    action: str = Field(..., pattern="^(delete|archive|unarchive|update_category|update_visibility)$")
    action_data: Optional[Dict[str, Any]] = None

    @validator('action_data')
    def validate_action_data(cls, v, values):
        action = values.get('action')
        if action in ['update_category', 'update_visibility'] and not v:
            raise ValueError(f'action_data required for action: {action}')
        return v

# Error response schemas
class DocumentErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None

# File validation constants
ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
    'application/msword',  # .doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
    'application/vnd.ms-excel',  # .xls
    'text/plain'
]

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB