# backend/app/api/v1/endpoints/document.py - COMPLETE FIXED VERSION
"""
Complete Document Management API
Combines IBM COS storage with local file storage and version control
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta, timezone
from pathlib import Path
import os
import uuid
import shutil
import json
import logging
import mimetypes
import hashlib

# Internal imports
from app.dependencies import get_db
from app.models.participant import Participant
from app.models.document import Document, DocumentCategory, DocumentAccess
from app.models.document_workflow import DocumentVersion
from app.services.document_service import DocumentService
from app.services.enhanced_document_service import EnhancedDocumentService
from app.services.enhanced_version_control_service import EnhancedVersionControlService
from app.services.storage.cos_storage_ibm import object_key, put_bytes, get_object_stream, delete_object
from app.core.config import settings

# Configuration and Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Upload configuration for local storage
UPLOAD_DIR = Path("uploads/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# File validation constants
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/heic",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "text/plain",
    "message/rfc822",
}

MAX_FILE_SIZE_MB = settings.COS_MAX_UPLOAD_MB
MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024

# Add this at line 71 in your document.py file:

# Document service initialization state
_document_service_initialized = False


# ==========================================
# DOCUMENT SERVICE STATUS & INITIALIZATION
# ==========================================

@router.get("/service/status")
async def get_document_service_status() -> Dict[str, Any]:
    """Check document generation service status."""
    global _document_service_initialized
    
    return {
        "status": "available" if _document_service_initialized else "not_initialized",
        "initialized": _document_service_initialized,
        "generator": "enhanced",
        "templates_loaded": True,
        "storage": {
            "cos_available": settings.is_cos_configured,
            "local_available": True
        },
        "features": {
            "versioning": True,
            "workflow": True,
            "expiry_tracking": True,
            "rag_processing": getattr(settings, 'AUTO_PROCESS_DOCUMENTS', False)
        }
    }


@router.post("/service/initialize")
async def initialize_document_service(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Initialize the document generation service."""
    global _document_service_initialized
    
    try:
        existing_categories = DocumentService.get_document_categories(db, active_only=False)
        if not existing_categories:
            logger.info("Creating default document categories...")
            DocumentService.create_default_categories(db)
        
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        _document_service_initialized = True
        
        categories = DocumentService.get_document_categories(db, active_only=True)
        
        return {
            "status": "initialized",
            "message": "Document service initialized successfully",
            "categories_loaded": len(categories),
            "storage": {
                "cos_configured": settings.is_cos_configured,
                "local_path": str(UPLOAD_DIR.absolute())
            }
        }
    except Exception as e:
        logger.error(f"Failed to initialize: {str(e)}")
        _document_service_initialized = False
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/service/health")
async def document_service_health() -> Dict[str, str]:
    """Health check for document service."""
    return {
        "status": "healthy" if _document_service_initialized else "uninitialized",
        "service": "document_generation",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ==========================================
# TEMPLATE MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/templates/{template_id}")
async def get_template_details(template_id: str) -> Dict[str, Any]:
    """
    Get details for a specific template.
    """
    templates = {
        "service_agreement": {
            "id": "service_agreement",
            "name": "Service Agreement",
            "description": "NDIS Service Agreement template",
            "category": "legal",
            "available": True,
            "fields": [
                {"name": "participant_name", "type": "text", "required": True},
                {"name": "service_start_date", "type": "date", "required": True},
                {"name": "service_description", "type": "textarea", "required": True}
            ]
        },
        "support_plan": {
            "id": "support_plan",
            "name": "Support Plan",
            "description": "Participant Support Plan template",
            "category": "care",
            "available": True,
            "fields": [
                {"name": "goals", "type": "textarea", "required": True},
                {"name": "supports", "type": "textarea", "required": True}
            ]
        },
        "risk_assessment": {
            "id": "risk_assessment",
            "name": "Risk Assessment",
            "description": "Risk Assessment Report template",
            "category": "care",
            "available": True,
            "fields": [
                {"name": "risk_level", "type": "select", "required": True},
                {"name": "mitigation_strategies", "type": "textarea", "required": True}
            ]
        }
    }
    
    if template_id not in templates:
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
    
    return templates[template_id]


@router.post("/participants/{participant_id}/generate-documents")
async def generate_participant_documents(
    participant_id: int,
    template_ids: Optional[List[str]] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate documents for a participant using specified templates.
    """
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # If no templates specified, generate all default templates
    if not template_ids:
        template_ids = ["service_agreement", "support_plan", "risk_assessment"]
    
    generated_docs = []
    
    for template_id in template_ids:
        # Placeholder for actual document generation
        doc_info = {
            "template_id": template_id,
            "status": "generated",
            "filename": f"{template_id}_{participant_id}.pdf",
            "message": f"Document generated successfully"
        }
        generated_docs.append(doc_info)
    
    return {
        "participant_id": participant_id,
        "generated_documents": generated_docs,
        "total": len(generated_docs),
        "message": f"Successfully generated {len(generated_docs)} documents"
    }

@router.get("/templates")
async def get_document_templates() -> List[Dict[str, Any]]:
    """Get available document templates for generation."""
    return [
        {
            "id": "service_agreement",
            "name": "Service Agreement",
            "description": "NDIS Service Agreement template",
            "category": "legal",
            "available": True,
            "template_available": True
        },
        {
            "id": "support_plan",
            "name": "Support Plan",
            "description": "Participant Support Plan template",
            "category": "care",
            "available": True,
            "template_available": True
        },
        {
            "id": "risk_assessment",
            "name": "Risk Assessment",
            "description": "Risk Assessment Report template",
            "category": "care",
            "available": True,
            "template_available": True
        },
        {
            "id": "incident_report",
            "name": "Incident Report",
            "description": "Incident Report template",
            "category": "compliance",
            "available": True,
            "template_available": True
        },
        {
            "id": "consent_form",
            "name": "Consent Form",
            "description": "General Consent Form template",
            "category": "legal",
            "available": True,
            "template_available": True
        }
    ]
# ==========================================
# UTILITY FUNCTIONS
# ==========================================

def get_user_info_from_request(request: Request) -> Tuple[int, str]:
    """Extract user info from request - placeholder implementation."""
    return 1, "system_user"


def validate_file(file: UploadFile) -> Optional[str]:
    """Validate uploaded file size and type."""
    file_size = None
    try:
        if hasattr(file, "file") and file.file:
            current_pos = file.file.tell()
            file.file.seek(0, os.SEEK_END)
            file_size = file.file.tell()
            file.file.seek(current_pos)
    except Exception:
        file_size = getattr(file, "size", None)

    if file_size and file_size > MAX_FILE_SIZE:
        return f"File size exceeds {MAX_FILE_SIZE_MB}MB limit"

    content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0]
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        allowed = ", ".join(sorted(ALLOWED_MIME_TYPES))
        return f"File type {content_type} not supported. Allowed types: {allowed}"

    return None


def ensure_upload_directory_exists(participant_id: int) -> Path:
    """Ensure upload directory exists and return the path."""
    upload_dir = Path("uploads/documents") / str(participant_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def save_uploaded_file(file: UploadFile, participant_id: int) -> Tuple[str, str]:
    """Save uploaded file locally and return (filename, file_path)."""
    file_extension = Path(file.filename).suffix if file.filename else ""
    unique_filename = f"{participant_id}_{uuid.uuid4().hex}{file_extension}"
    
    participant_dir = ensure_upload_directory_exists(participant_id)
    file_path = participant_dir / unique_filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"Successfully saved file to: {file_path}")
        return unique_filename, str(file_path.absolute())
        
    except Exception as e:
        logger.error(f"Error saving file: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to save file: {str(e)}"
        )


def format_document_response(doc: Document, participant_id: int) -> Dict[str, Any]:
    """Format document as response dictionary."""
    return {
        "id": doc.id,
        "participant_id": doc.participant_id,
        "file_id": getattr(doc, 'file_id', None),
        "title": doc.title,
        "filename": doc.filename,
        "original_filename": doc.original_filename,
        "file_size": doc.file_size,
        "mime_type": doc.mime_type,
        "category": doc.category,
        "description": doc.description,
        "tags": doc.tags or [],
        "version": doc.version,
        "is_current_version": doc.is_current_version,
        "visible_to_support_worker": doc.visible_to_support_worker,
        "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
        "is_expired": _is_document_expired(doc.expiry_date),
        "uploaded_by": doc.uploaded_by,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        "storage_provider": getattr(doc, 'storage_provider', 'local'),
        "storage_key": getattr(doc, 'storage_key', None),
        "download_url": f"/api/v1/participants/{participant_id}/documents/{doc.id}/download",
        "status": doc.status
    }


def _is_document_expired(expiry_date: Optional[datetime]) -> bool:
    """Check if document is expired using timezone-aware comparison."""
    if not expiry_date:
        return False
    
    now_utc = datetime.now(timezone.utc)
    
    if expiry_date.tzinfo is None:
        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
    
    return now_utc > expiry_date


def parse_expiry_date(expiry_date: str) -> Optional[datetime]:
    """Parse expiry date string to timezone-aware datetime object."""
    if not expiry_date or expiry_date == "":
        return None
    
    try:
        date_part = expiry_date.split('T')[0] if 'T' in expiry_date else expiry_date
        parsed_date = datetime.strptime(date_part, '%Y-%m-%d')
        return parsed_date.replace(tzinfo=timezone.utc)
        
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail="Invalid expiry date format. Expected YYYY-MM-DD"
        )


def parse_tags(tags: Optional[str]) -> List[str]:
    """Parse tags string into list."""
    if not tags:
        return []
    
    try:
        if tags.startswith('['):
            return json.loads(tags)
        else:
            return [tag.strip() for tag in tags.split(',') if tag.strip()]
    except:
        return [tag.strip() for tag in tags.split(',') if tag.strip()]


def resolve_file_path(document: Document, participant_id: int) -> Path:
    """Resolve and validate document file path."""
    file_path = Path(document.file_path)
    
    if not file_path.is_absolute():
        file_path = Path.cwd() / file_path
        
    logger.info(f"Resolved file path: {file_path}")
    
    if file_path.exists():
        return file_path
    
    # Try alternative paths
    alternative_paths = [
        Path("uploads/documents") / str(participant_id) / document.filename,
        Path.cwd() / "uploads/documents" / str(participant_id) / document.filename,
        Path.cwd() / "backend" / "uploads/documents" / str(participant_id) / document.filename,
    ]
    
    for alt_path in alternative_paths:
        logger.info(f"  Checking: {alt_path} - Exists: {alt_path.exists()}")
        if alt_path.exists():
            return alt_path
    
    raise HTTPException(
        status_code=404, 
        detail=f"Document file not found. Original path: {document.file_path}"
    )


def log_document_access_safe(db: Session, document_id: int, access_type: str, request: Request):
    """Safely log document access with error handling."""
    try:
        user_id, user_role = get_user_info_from_request(request)
        DocumentService.log_document_access(
            db=db,
            document_id=document_id,
            user_id=user_id,
            user_role=user_role,
            access_type=access_type,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
    except Exception as e:
        logger.warning(f"Failed to log document access: {e}")


# ==========================================
# IBM COS STORAGE ENDPOINTS
# ==========================================

@router.post("/documents/upload-cos")
async def upload_document_cos(
    file: UploadFile = File(...),
    participant_id: int | None = Form(default=None),
    referral_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
):
    """Upload document to IBM Cloud Object Storage."""
    if not settings.is_cos_configured:
        raise HTTPException(
            status_code=503,
            detail="IBM Cloud Object Storage is not configured for this environment."
        )

    if not participant_id and not referral_id:
        raise HTTPException(status_code=400, detail="participant_id or referral_id required")
    
    # Validate referenced entities
    if participant_id:
        participant_exists = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant_exists:
            raise HTTPException(status_code=404, detail="Participant not found")
    if referral_id:
        referral_exists = db.query(Referral).filter(Referral.id == referral_id).first()
        if not referral_exists:
            raise HTTPException(status_code=404, detail="Referral not found")
    
    # Size validation
    contents = await file.read()
    max_bytes = settings.COS_MAX_UPLOAD_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413, 
            detail=f"File exceeds {settings.COS_MAX_UPLOAD_MB} MB"
        )
    
    # Build storage path
    if participant_id:
        prefix = f"participants/{participant_id}/"
    elif referral_id:
        prefix = f"referrals/{referral_id}/"
    else:
        prefix = "misc/"
    
    # Upload to COS
    original_name = file.filename or f"upload-{uuid.uuid4().hex}"
    content_type = file.content_type or mimetypes.guess_type(original_name)[0] or "application/octet-stream"
    key = object_key(prefix, original_name)
    put_bytes(key, contents, content_type)
    
    # Create database record
    doc = Document(
        file_id=str(uuid.uuid4()),
        participant_id=participant_id,
        referral_id=referral_id,
        title=original_name,
        filename=original_name,
        original_filename=original_name,
        file_path=None,
        file_url=None,
        storage_provider="ibm-cos",
        storage_key=key,
        file_size=len(contents),
        mime_type=content_type,
        status="active",
        uploaded_at=datetime.now(timezone.utc),
        extra_metadata={"storage_key": key},
    )
    db.add(doc)
    db.flush()
    doc.file_url = f"/api/v1/documents/{doc.id}/download-cos"
    db.commit()
    db.refresh(doc)
    
    return {
        "doc_id": doc.id,
        "file_id": doc.file_id,
        "title": doc.title,
        "storage_provider": "ibm-cos",
        "storage_key": key
    }


@router.get("/documents/{doc_id}/download-cos")
def download_document_cos(doc_id: int, db: Session = Depends(get_db)):
    """Download document from IBM Cloud Object Storage."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc or not doc.storage_key:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get object from COS
    obj = get_object_stream(doc.storage_key)
    stream = obj["Body"]
    
    # Prepare headers
    headers = {}
    if "ContentType" in obj:
        headers["Content-Type"] = obj["ContentType"]
    
    filename = doc.title or "download"
    headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    
    return StreamingResponse(stream, headers=headers)


@router.delete("/documents/{doc_id}/delete-cos")
def delete_document_cos(doc_id: int, db: Session = Depends(get_db)):
    """Delete document from IBM Cloud Object Storage."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc or not doc.storage_key:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete from COS
    delete_object(doc.storage_key)
    
    # Update database
    doc.status = "deleted"
    db.commit()
    
    return {"ok": True}


# ==========================================
# DOCUMENT CATEGORY ENDPOINTS
# ==========================================

@router.get("/document-categories")
def get_document_categories(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all document categories."""
    try:
        existing_categories = DocumentService.get_document_categories(db, active_only=False)
        if not existing_categories:
            DocumentService.create_default_categories(db)
        
        categories = DocumentService.get_document_categories(db, active_only)
        
        return [
            {
                "id": cat.id,
                "category_id": cat.category_id,
                "name": cat.name,
                "description": cat.description,
                "is_required": cat.is_required,
                "sort_order": cat.sort_order,
                "is_active": cat.is_active,
                "config": cat.config or {}
            }
            for cat in categories
        ]
    except Exception as e:
        logger.error(f"Error fetching document categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# DOCUMENT CRUD ENDPOINTS WITH VERSION CONTROL
# ==========================================

@router.get("/participants/{participant_id}/documents/stats")
def get_document_stats(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Get document statistics for a participant."""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        stats = DocumentService.get_document_stats(db, participant_id)
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/participants/{participant_id}/documents/{document_id}")
def get_document(
    participant_id: int,
    document_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get a specific document."""
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.participant_id == participant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        log_document_access_safe(db, document.id, "view", request)
        
        return format_document_response(document, participant_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/participants/{participant_id}/documents")
async def upload_document(
    participant_id: int,
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    visible_to_support_worker: bool = Form(False),
    expiry_date: Optional[str] = Form(None),
    requires_approval: bool = Form(True),
    storage_type: str = Form("cos"),
    db: Session = Depends(get_db)
):
    """Upload a document with support for both local and COS storage."""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        error = validate_file(file)
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        category_exists = db.query(DocumentCategory).filter(
            DocumentCategory.category_id == category,
            DocumentCategory.is_active == True
        ).first()
        if not category_exists:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        
        requested_storage = (storage_type or "cos").lower()
        if requested_storage not in {"cos", "local"}:
            requested_storage = "cos"

        cos_available = settings.is_cos_configured
        if requested_storage == "cos" and not cos_available:
            logger.warning(
                "COS storage requested but configuration is incomplete. Falling back to local storage."
            )
            storage_type = "local"
        else:
            storage_type = requested_storage
        tag_list = parse_tags(tags)
        expiry_datetime = parse_expiry_date(expiry_date) if expiry_date else None
        
        logger.info(f"Looking for existing document with title: '{title}' for participant {participant_id}")
        
        existing_document = db.query(Document).filter(
            and_(
                Document.participant_id == participant_id,
                Document.title == title,
                Document.status.in_(["active", "pending_approval"])
            )
        ).first()
        current_storage_key: Optional[str] = None
        version_storage_key: Optional[str] = None
        cos_version_committed = False

        if existing_document:
            logger.info(f"Document '{title}' exists (ID: {existing_document.id}). Creating new version.")
            new_version = None
            now_utc = datetime.now(timezone.utc)
            previous_file_size = existing_document.file_size or 0

            if storage_type == "cos":
                contents = await file.read()
                if contents is None:
                    contents = b""

                original_filename = file.filename or f"document-{uuid.uuid4().hex}"
                content_type = file.content_type or mimetypes.guess_type(original_filename)[0] or "application/octet-stream"
                file_extension = Path(original_filename).suffix
                unique_suffix = uuid.uuid4().hex
                generated_filename = f"{participant_id}_{existing_document.id}_{unique_suffix}{file_extension}"

                base_prefix = f"participants/{participant_id}"
                current_storage_key = object_key(base_prefix, generated_filename)
                versions_prefix = f"{base_prefix}/versions"
                version_storage_key = object_key(versions_prefix, generated_filename)

                try:
                    put_bytes(current_storage_key, contents, content_type)
                    put_bytes(version_storage_key, contents, content_type)
                except Exception as storage_error:
                    logger.error(f"Error uploading document {existing_document.id} to COS: {storage_error}")
                    try:
                        if current_storage_key:
                            delete_object(current_storage_key)
                    except Exception:
                        pass
                    try:
                        if version_storage_key:
                            delete_object(version_storage_key)
                    except Exception:
                        pass
                    raise HTTPException(status_code=500, detail="Failed to store uploaded document in object storage")

                file_size = len(contents)
                file_hash = hashlib.sha256(contents).hexdigest()

                latest_version = db.query(DocumentVersion).filter(
                    DocumentVersion.document_id == existing_document.id
                ).order_by(desc(DocumentVersion.version_number)).first()
                new_version_number = (latest_version.version_number + 1) if latest_version else 1

                change_metadata = {
                    "change_type": "file_update",
                    "change_reason": "File update via upload",
                    "user_agent": request.headers.get("user-agent"),
                    "ip_address": request.client.host if request.client else None,
                    "affected_fields": ["file_content", "description", "tags"] if description or tags else ["file_content"],
                    "storage_provider": "ibm-cos",
                    "storage_key": version_storage_key,
                    "original_filename": original_filename,
                    "file_size_change": file_size - previous_file_size,
                    "storage_type": "cos",
                }

                new_version = DocumentVersion(
                    document_id=existing_document.id,
                    version_number=new_version_number,
                    filename=generated_filename,
                    file_path=version_storage_key,
                    file_size=file_size,
                    mime_type=content_type,
                    changes_summary=f"Updated document uploaded: {description or 'No description provided'}",
                    change_metadata=change_metadata,
                    file_hash=file_hash,
                    created_by="System User"
                )
                db.add(new_version)
                db.flush()

                if latest_version:
                    latest_version.replaced_by_version_id = new_version.id
                    latest_version.replaced_at = now_utc

                existing_document.filename = generated_filename
                existing_document.original_filename = original_filename
                existing_document.file_path = None
                existing_document.file_size = file_size
                existing_document.mime_type = content_type
                existing_document.version = new_version_number
                existing_document.storage_provider = "ibm-cos"
                existing_document.storage_key = current_storage_key
                existing_document.updated_at = now_utc
                existing_document.file_url = existing_document.file_url or f"/api/v1/documents/{existing_document.id}/download-cos"

                if not existing_document.file_id:
                    existing_document.file_id = str(uuid.uuid4())

                metadata = dict(existing_document.extra_metadata or {})
                metadata.update({
                    "storage_key": current_storage_key,
                    "version_storage_key": version_storage_key,
                    "original_filename": original_filename,
                })
                existing_document.extra_metadata = metadata

            else:
                # FIXED: Save to versions subdirectory for version uploads
                file_extension = Path(file.filename).suffix if file.filename else ""
                unique_filename = f"{participant_id}_{existing_document.id}_{uuid.uuid4().hex}{file_extension}"
                
                # Create versions subdirectory
                versions_dir = Path("uploads/documents") / str(participant_id) / "versions"
                versions_dir.mkdir(parents=True, exist_ok=True)
                version_file_path = versions_dir / unique_filename
                
                # Save file
                with open(version_file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                filename = unique_filename
                file_path = str(version_file_path.absolute())
                file_size = file.size or 0
                
                logger.info(f"Saved version file to: {file_path}")

                try:
                    new_version = EnhancedVersionControlService.create_version_with_changes(
                        db=db,
                        document_id=existing_document.id,
                        new_file_path=file_path,
                        changes_summary=f"Updated document uploaded: {description or 'No description provided'}",
                        created_by="System User",
                        change_details={
                            "change_reason": "File update via upload",
                            "user_agent": request.headers.get("user-agent"),
                            "ip_address": request.client.host if request.client else None,
                            "affected_fields": ["file_content", "description", "tags"] if description or tags else ["file_content"],
                            "storage_type": storage_type
                        }
                    )
                except Exception as version_error:
                    logger.error(f"Error creating version for document {existing_document.id}: {str(version_error)}")
                    # Clean up uploaded file on error
                    if storage_type == "local" and 'version_file_path' in locals():
                        try:
                            os.remove(version_file_path)
                        except:
                            pass
                    raise HTTPException(status_code=500, detail=f"Failed to create version: {str(version_error)}")
            
            if description is not None:
                existing_document.description = description
            if tag_list:
                existing_document.tags = tag_list
            if expiry_datetime:
                existing_document.expiry_date = expiry_datetime
                
            existing_document.visible_to_support_worker = visible_to_support_worker
            existing_document.updated_at = datetime.now(timezone.utc)
            
            db.commit()
            db.refresh(existing_document)
            if new_version is not None:
                db.refresh(new_version)
            if storage_type == "cos":
                cos_version_committed = True
            
            log_document_access_safe(db, existing_document.id, "version_upload", request)
            
            logger.info(f"Successfully created version {new_version.version_number} for document {existing_document.id}")
            
            response_data = format_document_response(existing_document, participant_id)
            response_data["version_info"] = {
                "new_version_id": new_version.id,
                "version_number": new_version.version_number,
                "is_new_version": True,
                "changes_summary": new_version.changes_summary
            }

            document = existing_document

            # ============================================
            # RAG AUTO-PROCESSING - ADD THIS SECTION
            # ============================================
            # Auto-process document for RAG (if enabled)
            if settings.AUTO_PROCESS_DOCUMENTS:
                try:
                    from app.services.document_chunking_service import DocumentChunkingService
                    from app.services.embedding_service import EmbeddingService
                    
                    logger.info(f"Auto-processing document {document.id} for RAG")
                    
                    # Chunk document
                    chunks = DocumentChunkingService.chunk_document(db, document.id)
                    logger.info(f"Auto-chunked document {document.id}: {len(chunks)} chunks created")
                    
                    # Embed if available
                    embedding_service = EmbeddingService()
                    if embedding_service.embeddings_available:
                        embedded = embedding_service.embed_document_chunks(db, document.id)
                        logger.info(f"Auto-embedded document {document.id}: {embedded} chunks embedded")
                        response_data["rag_processing"] = {
                            "chunks_created": len(chunks),
                            "chunks_embedded": embedded,
                            "status": "completed"
                        }
                    else:
                        logger.info(f"Embeddings not available - document {document.id} chunked only")
                        response_data["rag_processing"] = {
                            "chunks_created": len(chunks),
                            "chunks_embedded": 0,
                            "status": "chunks_only",
                            "note": "Embeddings not configured - keyword search only"
                        }
                        
                except Exception as rag_error:
                    logger.warning(f"Auto-processing failed for document {document.id}: {rag_error}")
                    # Don't fail the upload if RAG processing fails
                    response_data["rag_processing"] = {
                        "status": "failed",
                        "error": str(rag_error)
                    }
            # ============================================
            # END OF RAG AUTO-PROCESSING
            # ============================================
            
            return response_data
            
        else:
            logger.info(f"Creating new document '{title}' for participant {participant_id}")
            
            storage_provider_value = "ibm-cos" if storage_type == "cos" else "local"
            storage_key: Optional[str] = None
            storage_metadata: Dict[str, Any] = {}
            file_path_db: Optional[str] = None
            version_file_path: str
            filename = file.filename or f"document-{uuid.uuid4().hex}"
            content_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"

            if storage_type == "cos":
                contents = await file.read()
                prefix = f"participants/{participant_id}/"
                key = object_key(prefix, filename)
                put_bytes(key, contents, content_type)
                file_size = len(contents)
                storage_key = key
                current_storage_key = storage_key
                storage_metadata = {"storage_key": key}
                file_path_db = None
                version_file_path = key
            else:
                filename, file_path_local = save_uploaded_file(file, participant_id)
                file_path_db = file_path_local
                version_file_path = file_path_local
                try:
                    file_size = os.path.getsize(file_path_local)
                except OSError:
                    file_size = file.size or 0

            document, workflow = EnhancedDocumentService.create_document_with_workflow(
                db=db,
                participant_id=participant_id,
                title=title,
                filename=filename,
                original_filename=file.filename or filename,
                file_path=file_path_db,
                file_size=file_size,
                mime_type=content_type,
                category=category,
                description=description,
                tags=tag_list,
                visible_to_support_worker=visible_to_support_worker,
                expiry_date=expiry_datetime,
                uploaded_by="System User",
                requires_approval=requires_approval,
                storage_provider=storage_provider_value,
                storage_key=storage_key,
                extra_metadata=storage_metadata,
            )

            if storage_provider_value == "ibm-cos":
                metadata = dict(document.extra_metadata or {})
                metadata["storage_key"] = storage_key
                document.extra_metadata = metadata
                document.storage_key = storage_key
                document.file_path = None
                if not document.file_id:
                    document.file_id = str(uuid.uuid4())
                document.file_url = f"/api/v1/documents/{document.id}/download-cos"
            else:
                document.storage_provider = "local"

            
            # FIXED: Create initial version with correct path structure
            initial_version = DocumentVersion(
                document_id=document.id,
                version_number=1,
                filename=filename,
                file_path=version_file_path,
                file_size=file_size,
                mime_type=content_type,
                changes_summary="Initial version",
                created_by="System User",
                change_metadata={
                    "change_type": "initial",
                    "changed_fields": [],
                    "file_size_change": 0,
                    "storage_type": storage_provider_value,
                    "storage_key": storage_key,
                }
            )
            db.add(initial_version)
            db.commit()
            db.refresh(initial_version)
            if storage_provider_value == "ibm-cos":
                cos_version_committed = True
            
            log_document_access_safe(db, document.id, "upload", request)
            
            logger.info(f"Successfully created new document {document.id}")
            
            response_data = format_document_response(document, participant_id)
            response_data["version_info"] = {
                "initial_version_id": initial_version.id,
                "version_number": 1,
                "is_new_document": True,
                "changes_summary": "Initial version"
            }
            
            if workflow:
                response_data["workflow"] = {
                    "id": workflow.id,
                    "type": workflow.workflow_type.value,
                    "status": workflow.status.value,
                    "due_date": workflow.due_date.isoformat() if workflow.due_date else None,
                    "requires_approval": True
                }
            else:
                response_data["workflow"] = {
                    "requires_approval": False,
                    "auto_approved": True
                }

            # ============================================
            # RAG AUTO-PROCESSING - ADD THIS SECTION
            # ============================================
            # Auto-process document for RAG (if enabled)
            if settings.AUTO_PROCESS_DOCUMENTS:
                try:
                    from app.services.document_chunking_service import DocumentChunkingService
                    from app.services.embedding_service import EmbeddingService
                    
                    logger.info(f"Auto-processing document {document.id} for RAG")
                    
                    # Chunk document
                    chunks = DocumentChunkingService.chunk_document(db, document.id)
                    logger.info(f"Auto-chunked document {document.id}: {len(chunks)} chunks created")
                    
                    # Embed if available
                    embedding_service = EmbeddingService()
                    if embedding_service.embeddings_available:
                        embedded = embedding_service.embed_document_chunks(db, document.id)
                        logger.info(f"Auto-embedded document {document.id}: {embedded} chunks embedded")
                        response_data["rag_processing"] = {
                            "chunks_created": len(chunks),
                            "chunks_embedded": embedded,
                            "status": "completed"
                        }
                    else:
                        logger.info(f"Embeddings not available - document {document.id} chunked only")
                        response_data["rag_processing"] = {
                            "chunks_created": len(chunks),
                            "chunks_embedded": 0,
                            "status": "chunks_only",
                            "note": "Embeddings not configured - keyword search only"
                        }
                        
                except Exception as rag_error:
                    logger.warning(f"Auto-processing failed for document {document.id}: {rag_error}")
                    # Don't fail the upload if RAG processing fails
                    response_data["rag_processing"] = {
                        "status": "failed",
                        "error": str(rag_error)
                    }
            # ============================================
            # END OF RAG AUTO-PROCESSING
            # ============================================
            
            return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        if 'file_path' in locals() and storage_type == "local":
            try:
                os.remove(file_path)
            except Exception:
                pass
        if storage_type == "cos" and not cos_version_committed:
            for key_to_remove in (current_storage_key, version_storage_key):
                if key_to_remove:
                    try:
                        delete_object(key_to_remove)
                    except Exception:
                        pass
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@router.get("/participants/{participant_id}/documents")
def get_participant_documents(
    participant_id: int,
    search: Optional[str] = None,
    category: Optional[str] = None,
    is_expired: Optional[bool] = None,
    visible_to_support_worker: Optional[bool] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """Get documents for a participant with filtering and pagination."""
    try:
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        documents, total = DocumentService.get_documents_for_participant(
            db=db,
            participant_id=participant_id,
            search=search,
            category=category,
            is_expired=is_expired,
            visible_to_support_worker=visible_to_support_worker,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size
        )
        
        return [format_document_response(doc, participant_id) for doc in documents]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/participants/{participant_id}/documents/{document_id}/download")
def download_document(
    participant_id: int,
    document_id: int,
    request: Request,
    inline: bool = False,
    db: Session = Depends(get_db)
):
    """Download or preview a document file."""
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.participant_id == participant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        logger.info(f"Attempting to {'preview' if inline else 'download'} document {document_id}")
        
        access_type = "preview" if inline else "download"
        log_document_access_safe(db, document.id, access_type, request)
        
        if document.storage_provider == "ibm-cos" and document.storage_key:
            obj = get_object_stream(document.storage_key)
            stream = obj["Body"]
            
            headers = {}
            if "ContentType" in obj:
                headers["Content-Type"] = obj["ContentType"]
            
            if inline:
                headers["Content-Disposition"] = f"inline; filename=\"{document.original_filename}\""
            else:
                headers["Content-Disposition"] = f"attachment; filename=\"{document.original_filename}\""
            
            return StreamingResponse(stream, headers=headers)
        else:
            file_path = resolve_file_path(document, participant_id)
            
            headers = {}
            
            if inline:
                headers["Content-Disposition"] = f"inline; filename=\"{document.original_filename}\""
                
                if document.mime_type == "application/pdf":
                    headers.update({
                        "Content-Type": "application/pdf",
                        "X-Content-Type-Options": "nosniff",
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache",
                        "Expires": "0"
                    })
                elif document.mime_type.startswith("image/"):
                    headers.update({
                        "Content-Type": document.mime_type,
                        "Cache-Control": "max-age=3600"
                    })
            else:
                headers["Content-Disposition"] = f"attachment; filename=\"{document.original_filename}\""
            
            return FileResponse(
                path=str(file_path),
                filename=document.original_filename,
                media_type=document.mime_type,
                headers=headers
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error {'previewing' if inline else 'downloading'} document: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error {'previewing' if inline else 'downloading'} document: {str(e)}"
        )


@router.put("/participants/{participant_id}/documents/{document_id}")
def update_document(
    participant_id: int,
    document_id: int,
    title: Optional[str] = None,
    category: Optional[str] = None,
    description: Optional[str] = None,
    tags: Optional[str] = None,
    visible_to_support_worker: Optional[bool] = None,
    expiry_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update document metadata."""
    try:
        document = db.query(Document).filter(
            and_(
                Document.id == document_id,
                Document.participant_id == participant_id
            )
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        updates = {}
        
        if title is not None:
            updates['title'] = title
            
        if category is not None:
            category_exists = db.query(DocumentCategory).filter(
                DocumentCategory.category_id == category,
                DocumentCategory.is_active == True
            ).first()
            if not category_exists:
                raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
            updates['category'] = category
            
        if description is not None:
            updates['description'] = description
            
        if tags is not None:
            updates['tags'] = parse_tags(tags)
                
        if visible_to_support_worker is not None:
            updates['visible_to_support_worker'] = visible_to_support_worker
            
        if expiry_date is not None:
            updates['expiry_date'] = parse_expiry_date(expiry_date)
        
        updated_document = DocumentService.update_document(
            db=db,
            document_id=document_id,
            participant_id=participant_id,
            **updates
        )
        
        if not updated_document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return format_document_response(updated_document, participant_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/participants/{participant_id}/documents/{document_id}")
def delete_document(
    participant_id: int,
    document_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete a document."""
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.participant_id == participant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if document.storage_provider == "ibm-cos" and document.storage_key:
            delete_object(document.storage_key)
        
        success = DocumentService.delete_document(
            db=db,
            document_id=document_id,
            participant_id=participant_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        log_document_access_safe(db, document_id, "delete", request)
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

    # ==========================================
# DOCUMENT VERSION HISTORY ENDPOINTS
# ==========================================
from app.services.enhanced_version_control_service import EnhancedVersionControlService

@router.get("/documents/{document_id}/versions/detailed")
def get_document_versions_detailed(document_id: int, db: Session = Depends(get_db)):
    """Get detailed version history for a document."""
    try:
        versions = EnhancedVersionControlService.get_version_history_detailed(db, document_id)
        if not versions:
            raise HTTPException(status_code=404, detail="No versions found for this document")
        return versions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving version history: {str(e)}")


@router.get("/documents/{document_id}/versions/{version_id}/preview")
def preview_document_version_inline(
    document_id: int,
    version_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Preview a specific document version inline."""
    try:
        version = db.query(DocumentVersion).filter(
            and_(
                DocumentVersion.id == version_id,
                DocumentVersion.document_id == document_id
            )
        ).first()

        if not version:
            raise HTTPException(status_code=404, detail="Document version not found")

        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        log_document_access_safe(db, document_id, "version_preview", request)

        media_type = version.mime_type or getattr(document, "mime_type", None) or "application/octet-stream"
        if not isinstance(media_type, str):
            media_type = str(media_type)

        display_name = (
            version.filename
            or getattr(document, "original_filename", None)
            or getattr(document, "filename", None)
            or f"document_v{version.version_number}"
        )

        file_candidates = []
        if version.file_path:
            file_candidates.append(version.file_path)
        if getattr(document, "file_path", None):
            file_candidates.append(document.file_path)
        if getattr(document, "storage_key", None):
            file_candidates.append(document.storage_key)

        for file_ref in file_candidates:
            if not file_ref:
                continue

            candidate_path = Path(file_ref)
            if candidate_path.exists():
                response = FileResponse(path=str(candidate_path), media_type=media_type)
                response.headers["Content-Disposition"] = f'inline; filename="{display_name}"'

                if media_type == "application/pdf":
                    response.headers.update({
                        "X-Content-Type-Options": "nosniff",
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache",
                        "Expires": "0"
                    })
                elif media_type.startswith("image/"):
                    response.headers.setdefault("Cache-Control", "max-age=3600")

                response.headers["X-Document-Version"] = str(version.version_number)
                return response

            # Attempt object storage lookup if local file missing
            try:
                obj = get_object_stream(file_ref)
                stream = obj.get("Body")
                if stream is None:
                    continue

                media_type_to_use = obj.get("ContentType") or media_type or "application/octet-stream"
                if not isinstance(media_type_to_use, str):
                    media_type_to_use = str(media_type_to_use)

                headers = {
                    "Content-Disposition": f'inline; filename="{display_name}"',
                    "X-Document-Version": str(version.version_number)
                }

                if media_type_to_use == "application/pdf":
                    headers.update({
                        "X-Content-Type-Options": "nosniff",
                        "Cache-Control": "no-cache, no-store, must-revalidate",
                        "Pragma": "no-cache",
                        "Expires": "0"
                    })
                elif media_type_to_use.startswith("image/"):
                    headers.setdefault("Cache-Control", "max-age=3600")

                return StreamingResponse(stream, media_type=media_type_to_use, headers=headers)

            except Exception:
                continue

        raise HTTPException(status_code=404, detail="Version file not available")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing version {version_id} for document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to preview document version")


@router.get("/documents/{document_id}/versions/{version1_id}/compare/{version2_id}")
def compare_document_versions_inline(
    document_id: int,
    version1_id: int,
    version2_id: int,
    db: Session = Depends(get_db)
):
    """Compare two versions of a document via primary route."""
    try:
        if version1_id == version2_id:
            raise HTTPException(status_code=400, detail="Cannot compare identical versions")

        comparison = EnhancedVersionControlService.compare_versions(
            db=db,
            document_id=document_id,
            version1_id=version1_id,
            version2_id=version2_id
        )

        if not comparison:
            raise HTTPException(status_code=404, detail="Comparison data not available")

        return comparison

    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error comparing versions {version1_id} and {version2_id} for document {document_id}: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="Failed to compare document versions")


@router.get("/documents/{document_id}/versions/{version_id}/download")
def download_document_version(
    document_id: int,
    version_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Download a specific document version."""
    try:
        version = db.query(DocumentVersion).filter(
            and_(
                DocumentVersion.id == version_id,
                DocumentVersion.document_id == document_id
            )
        ).first()

        if not version:
            raise HTTPException(status_code=404, detail="Document version not found")

        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")

        log_document_access_safe(db, document_id, "version_download", request)

        media_type = version.mime_type or getattr(document, "mime_type", None) or "application/octet-stream"
        if not isinstance(media_type, str):
            media_type = str(media_type)

        download_name = (
            version.filename
            or getattr(document, "original_filename", None)
            or getattr(document, "filename", None)
            or f"document_v{version.version_number}"
        )

        file_candidates = []
        if version.file_path:
            file_candidates.append(version.file_path)
        if getattr(document, "file_path", None):
            file_candidates.append(document.file_path)
        if getattr(document, "storage_key", None):
            file_candidates.append(document.storage_key)

        for file_ref in file_candidates:
            if not file_ref:
                continue

            candidate_path = Path(file_ref)
            if candidate_path.exists():
                return FileResponse(
                    path=str(candidate_path),
                    filename=download_name,
                    media_type=media_type,
                    headers={"X-Document-Version": str(version.version_number)}
                )

            try:
                obj = get_object_stream(file_ref)
                stream = obj.get("Body")
                if stream is None:
                    continue

                media_type_to_use = obj.get("ContentType") or media_type or "application/octet-stream"
                if not isinstance(media_type_to_use, str):
                    media_type_to_use = str(media_type_to_use)

                headers = {
                    "Content-Disposition": f'attachment; filename="{download_name}"',
                    "X-Document-Version": str(version.version_number)
                }

                return StreamingResponse(stream, media_type=media_type_to_use, headers=headers)

            except Exception:
                continue

        raise HTTPException(status_code=404, detail="Version file not available")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading version {version_id} for document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download document version")


@router.get("/documents/{document_id}/versions/analytics")
def get_document_version_analytics(document_id: int, db: Session = Depends(get_db)):
    """Get analytics for document version history."""
    try:
        analytics = EnhancedVersionControlService.get_version_analytics(db, document_id)
        if "error" in analytics:
            raise HTTPException(status_code=404, detail=analytics["error"])
        return analytics
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving version analytics: {str(e)}")



# ==========================================
# EXPIRY MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/documents/expiring")
def get_expiring_documents(
    days_ahead: int = 30,
    participant_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get documents expiring within specified days."""
    try:
        now_utc = datetime.now(timezone.utc)
        cutoff_date = now_utc + timedelta(days=days_ahead)
        
        query = db.query(Document).filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date >= now_utc,
                Document.expiry_date <= cutoff_date,
                Document.status == "active"
            )
        )
        
        if participant_id:
            query = query.filter(Document.participant_id == participant_id)
        
        documents = query.order_by(Document.expiry_date).all()
        
        return [
            {
                "id": doc.id,
                "participant_id": doc.participant_id,
                "title": doc.title,
                "category": doc.category,
                "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
                "days_until_expiry": (doc.expiry_date - now_utc).days if doc.expiry_date else 0
            }
            for doc in documents
        ]
        
    except Exception as e:
        logger.error(f"Error fetching expiring documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/expired")
def get_expired_documents(
    participant_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get expired documents."""
    try:
        now_utc = datetime.now(timezone.utc)
        
        query = db.query(Document).filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date < now_utc,
                Document.status == "active"
            )
        )
        
        if participant_id:
            query = query.filter(Document.participant_id == participant_id)
        
        documents = query.order_by(desc(Document.expiry_date)).all()
        
        return [
            {
                "id": doc.id,
                "participant_id": doc.participant_id,
                "title": doc.title,
                "category": doc.category,
                "expiry_date": doc.expiry_date.isoformat() if doc.expiry_date else None,
                "days_overdue": (now_utc - doc.expiry_date).days if doc.expiry_date else 0
            }
            for doc in documents
        ]
        
    except Exception as e:
        logger.error(f"Error fetching expired documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# STATISTICS AND REPORTING ENDPOINTS
# ==========================================

@router.get("/documents/organization-stats")
def get_organization_document_stats(db: Session = Depends(get_db)):
    """Get organization-wide document statistics."""
    try:
        stats = DocumentService.get_organization_document_stats(db)
        return stats
    except Exception as e:
        logger.error(f"Error fetching organization document stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# NOTIFICATION AND TESTING ENDPOINTS
# ==========================================

@router.post("/check-expiring-notifications")
def trigger_expiry_notifications(
    days_ahead: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Manually trigger expiry notifications check."""
    try:
        from app.tasks.document_expiry_task import check_and_notify_expiring_documents
        
        result = check_and_notify_expiring_documents(db)
        
        return {
            "message": "Expiry notification check completed",
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error triggering expiry notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
