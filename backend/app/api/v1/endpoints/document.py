# backend/app/api/v1/endpoints/document.py - COMPLETE FILE WITH ALL ENHANCEMENTS

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import os
import uuid
import shutil
import json
import logging

# Internal imports
from app.core.database import get_db
from app.models.participant import Participant
from app.models.document import Document, DocumentCategory, DocumentAccess
from app.services.document_service import DocumentService
from app.services.enhanced_document_service import EnhancedDocumentService

# Configuration and Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Upload configuration
UPLOAD_DIR = Path("uploads/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# File validation constants
ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain'
]

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# ==========================================
# UTILITY FUNCTIONS
# ==========================================

def get_user_info_from_request(request: Request) -> Tuple[int, str]:
    """Extract user info from request - placeholder implementation."""
    # In a real system, this would extract from JWT token or session
    # For now, return default values
    return 1, "system_user"  # user_id, user_role


def validate_file(file: UploadFile) -> Optional[str]:
    """Validate uploaded file size and type."""
    if file.size and file.size > MAX_FILE_SIZE:
        return f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"
    
    if file.content_type not in ALLOWED_MIME_TYPES:
        return f"File type {file.content_type} not supported"
    
    return None


def ensure_upload_directory_exists(participant_id: int) -> Path:
    """Ensure upload directory exists and return the path."""
    upload_dir = Path("uploads/documents") / str(participant_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def save_uploaded_file(file: UploadFile, participant_id: int) -> Tuple[str, str]:
    """Save uploaded file and return (filename, file_path)."""
    # Generate unique filename
    file_extension = Path(file.filename).suffix if file.filename else ""
    unique_filename = f"{participant_id}_{uuid.uuid4().hex}{file_extension}"
    
    # Ensure participant directory exists
    participant_dir = ensure_upload_directory_exists(participant_id)
    file_path = participant_dir / unique_filename
    
    # Save file
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
        "is_expired": doc.expiry_date < datetime.now() if doc.expiry_date else False,
        "uploaded_by": doc.uploaded_by,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        "download_url": f"/api/v1/participants/{participant_id}/documents/{doc.id}/download",
        "status": doc.status
    }


def parse_expiry_date(expiry_date: str) -> Optional[datetime]:
    """Parse expiry date string to datetime object."""
    if not expiry_date or expiry_date == "":
        return None
    
    try:
        # Handle both ISO format and date-only format
        date_part = expiry_date.split('T')[0] if 'T' in expiry_date else expiry_date
        return datetime.strptime(date_part, '%Y-%m-%d')
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
    
    # If the path is relative, make it absolute from the current working directory
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
    
    logger.info("Trying alternative paths:")
    for alt_path in alternative_paths:
        logger.info(f"  Checking: {alt_path} - Exists: {alt_path.exists()}")
        if alt_path.exists():
            return alt_path
    
    # Debug: list directory contents
    try:
        upload_dir = Path("uploads/documents") / str(participant_id)
        if upload_dir.exists():
            logger.info(f"Contents of {upload_dir}:")
            for item in upload_dir.iterdir():
                logger.info(f"  - {item.name}")
        else:
            logger.info(f"Upload directory does not exist: {upload_dir}")
    except Exception as e:
        logger.error(f"Error listing directory: {e}")
    
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
# DOCUMENT CATEGORY ENDPOINTS
# ==========================================

@router.get("/document-categories")
def get_document_categories(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all document categories."""
    try:
        # Initialize default categories if none exist
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
# DOCUMENT CRUD ENDPOINTS
# ==========================================

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
    db: Session = Depends(get_db)
):
    """Upload a document for a participant with workflow support."""
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Validate file
        error = validate_file(file)
        if error:
            raise HTTPException(status_code=400, detail=error)
        
        # Validate category exists
        category_exists = db.query(DocumentCategory).filter(
            DocumentCategory.category_id == category,
            DocumentCategory.is_active == True
        ).first()
        if not category_exists:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        
        # Parse tags and expiry date
        tag_list = parse_tags(tags)
        expiry_datetime = parse_expiry_date(expiry_date) if expiry_date else None
        
        # Save file
        filename, file_path = save_uploaded_file(file, participant_id)
        
        # Create document with workflow using enhanced service
        document, workflow = EnhancedDocumentService.create_document_with_workflow(
            db=db,
            participant_id=participant_id,
            title=title,
            filename=filename,
            original_filename=file.filename,
            file_path=file_path,
            file_size=file.size or 0,
            mime_type=file.content_type,
            category=category,
            description=description,
            tags=tag_list,
            visible_to_support_worker=visible_to_support_worker,
            expiry_date=expiry_datetime,
            uploaded_by="System User",  # TODO: Replace with actual user from auth
            requires_approval=requires_approval
        )
        
        # Log access
        log_document_access_safe(db, document.id, "upload", request)
        
        # Prepare response
        response_data = format_document_response(document, participant_id)
        
        # Add workflow information
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
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        # Clean up file if it was saved
        try:
            if 'file_path' in locals():
                os.remove(file_path)
        except:
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
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get documents using service
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
        
        # Log access
        log_document_access_safe(db, document.id, "view", request)
        
        return format_document_response(document, participant_id)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/participants/{participant_id}/documents/{document_id}/download")
def download_document(
    participant_id: int,
    document_id: int,
    request: Request,
    inline: bool = False,  # Key parameter for preview vs download
    db: Session = Depends(get_db)
):
    """Download or preview a document file - ENHANCED WITH ACCESS LOGGING."""
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.participant_id == participant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Debug logging
        logger.info(f"Attempting to {'preview' if inline else 'download'} document {document_id}")
        logger.info(f"File path from database: {document.file_path}")
        
        # Resolve file path
        file_path = resolve_file_path(document, participant_id)
        
        # Enhanced access logging with user info
        access_type = "preview" if inline else "download"
        log_document_access_safe(db, document.id, access_type, request)
        
        # Set appropriate headers based on whether it's for preview or download
        headers = {}
        
        if inline:
            # For preview - display inline in browser
            headers["Content-Disposition"] = f"inline; filename=\"{document.original_filename}\""
            
            # Add specific headers for different file types
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
                    "Cache-Control": "max-age=3600"  # Cache images for 1 hour
                })
            elif document.mime_type == "text/plain":
                headers.update({
                    "Content-Type": "text/plain; charset=utf-8",
                    "X-Content-Type-Options": "nosniff"
                })
            
            logger.info(f"Setting inline headers for preview: {headers}")
        else:
            # For download - force download
            headers["Content-Disposition"] = f"attachment; filename=\"{document.original_filename}\""
            logger.info(f"Setting attachment headers for download: {headers}")
        
        # Return the file
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
        
        # Prepare updates
        updates = {}
        
        if title is not None:
            updates['title'] = title
            
        if category is not None:
            # Validate category exists
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
        
        # Update the document
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
        success = DocumentService.delete_document(
            db=db,
            document_id=document_id,
            participant_id=participant_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Log access
        log_document_access_safe(db, document_id, "delete", request)
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/participants/{participant_id}/documents/{document_id}/access-log")
def get_document_access_log(
    participant_id: int,
    document_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Get access log for a specific document."""
    try:
        # Verify document exists
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.participant_id == participant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get access logs
        access_logs = db.query(DocumentAccess).filter(
            DocumentAccess.document_id == document_id
        ).order_by(desc(DocumentAccess.accessed_at)).limit(limit).all()
        
        return [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_role": log.user_role,
                "access_type": log.access_type,
                "accessed_at": log.accessed_at.isoformat() if log.accessed_at else None,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent if hasattr(log, 'user_agent') else None
            }
            for log in access_logs
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching access log: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/participants/{participant_id}/documents/{document_id}/history")
def get_document_history(
    participant_id: int,
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get version history for a document."""
    try:
        # Verify document exists
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.participant_id == participant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get all versions (parent and children)
        all_versions = []
        
        # Current document
        all_versions.append({
            "id": document.id,
            "version": document.version,
            "title": document.title,
            "filename": document.filename,
            "original_filename": document.original_filename,
            "file_size": document.file_size,
            "is_current": document.is_current_version,
            "created_at": document.created_at.isoformat() if document.created_at else None,
            "updated_at": document.updated_at.isoformat() if document.updated_at else None,
            "uploaded_by": document.uploaded_by,
            "status": document.status,
            "download_url": f"/api/v1/participants/{participant_id}/documents/{document.id}/download"
        })
        
        # Child versions (if any) - assuming there's a parent_document_id field
        if hasattr(Document, 'parent_document_id'):
            child_documents = db.query(Document).filter(
                Document.parent_document_id == document_id
            ).order_by(desc(Document.version)).all()
            
            for child_doc in child_documents:
                all_versions.append({
                    "id": child_doc.id,
                    "version": child_doc.version,
                    "title": child_doc.title,
                    "filename": child_doc.filename,
                    "original_filename": child_doc.original_filename,
                    "file_size": child_doc.file_size,
                    "is_current": child_doc.is_current_version,
                    "created_at": child_doc.created_at.isoformat() if child_doc.created_at else None,
                    "updated_at": child_doc.updated_at.isoformat() if child_doc.updated_at else None,
                    "uploaded_by": child_doc.uploaded_by,
                    "status": child_doc.status,
                    "download_url": f"/api/v1/participants/{participant_id}/documents/{child_doc.id}/download"
                })
        
        # Sort by version number descending (latest first)
        all_versions.sort(key=lambda x: x["version"], reverse=True)
        
        return {
            "document_id": document_id,
            "participant_id": participant_id,
            "document_title": document.title,
            "current_version": document.version,
            "total_versions": len(all_versions),
            "versions": all_versions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# STATISTICS AND REPORTING ENDPOINTS
# ==========================================

@router.get("/participants/{participant_id}/documents/stats")
def get_document_stats(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Get document statistics for a participant."""
    try:
        # Verify participant exists
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
        cutoff_date = datetime.now() + timedelta(days=days_ahead)
        
        query = db.query(Document).filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date >= datetime.now(),
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
                "days_until_expiry": (doc.expiry_date - datetime.now()).days if doc.expiry_date else 0
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
        query = db.query(Document).filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date < datetime.now(),
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
                "days_overdue": (datetime.now() - doc.expiry_date).days if doc.expiry_date else 0
            }
            for doc in documents
        ]
        
    except Exception as e:
        logger.error(f"Error fetching expired documents: {str(e)}")
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
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error triggering expiry notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications/test-email-config")
def test_email_configuration():
    """Test email configuration."""
    try:
        from app.services.email_service import EmailService
        
        email_service = EmailService()
        test_result = email_service.test_email_configuration()
        
        return test_result
        
    except Exception as e:
        logger.error(f"Error testing email configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))