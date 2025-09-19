# backend/app/api/v1/endpoints/document.py - COMPLETE FIXED FILE WITH INLINE PREVIEW
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from app.core.database import get_db
from app.models.participant import Participant
from app.models.document import Document, DocumentCategory
from app.services.document_service import DocumentService
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import uuid
import shutil
from pathlib import Path
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Configuration
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

def validate_file(file: UploadFile) -> Optional[str]:
    """Validate uploaded file"""
    if file.size and file.size > MAX_FILE_SIZE:
        return f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit"
    
    if file.content_type not in ALLOWED_MIME_TYPES:
        return f"File type {file.content_type} not supported"
    
    return None

def ensure_upload_directory_exists(participant_id: int) -> Path:
    """Ensure upload directory exists and return the path"""
    upload_dir = Path("uploads/documents") / str(participant_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir

def save_uploaded_file(file: UploadFile, participant_id: int) -> tuple[str, str]:
    """Save uploaded file and return (filename, file_path) - FIXED VERSION"""
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
        
        # Return the absolute path to ensure it can be found later
        return unique_filename, str(file_path.absolute())
        
    except Exception as e:
        logger.error(f"Error saving file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

def format_document_response(doc: Document, participant_id: int) -> Dict[str, Any]:
    """Format document as response dictionary"""
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

@router.get("/document-categories")
def get_document_categories(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all document categories"""
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
    db: Session = Depends(get_db)
):
    """Upload a document for a participant"""
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
        
        # Parse tags
        tag_list = []
        if tags:
            try:
                tag_list = json.loads(tags) if tags.startswith('[') else [tag.strip() for tag in tags.split(',')]
            except:
                tag_list = [tag.strip() for tag in tags.split(',') if tag.strip()]
        
        # Parse expiry date - FIXED: Make it timezone-naive
        expiry_datetime = None
        if expiry_date:
            try:
                # Parse the date and ensure it's timezone-naive
                if 'T' in expiry_date:
                    # Remove timezone info if present
                    date_part = expiry_date.split('T')[0] if 'T' in expiry_date else expiry_date
                    expiry_datetime = datetime.strptime(date_part, '%Y-%m-%d')
                else:
                    # Just a date string
                    expiry_datetime = datetime.strptime(expiry_date, '%Y-%m-%d')
                    
            except Exception as e:
                logger.error(f"Error parsing expiry date '{expiry_date}': {str(e)}")
                raise HTTPException(status_code=400, detail=f"Invalid expiry date format. Expected YYYY-MM-DD")
        
        # Save file
        filename, file_path = save_uploaded_file(file, participant_id)
        
        # Create document record using service
        document = DocumentService.create_document(
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
            uploaded_by="System User"  # Replace with actual user from auth
        )
        
        # Log access
        DocumentService.log_document_access(
            db=db,
            document_id=document.id,
            user_id=1,  # Replace with actual user ID from auth
            user_role="admin",
            access_type="upload",
            ip_address=request.client.host if request.client else None
        )
        
        # Return response
        return format_document_response(document, participant_id)
        
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
    """Get documents for a participant with filtering and pagination"""
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
        
        # Format response
        return [format_document_response(doc, participant_id) for doc in documents]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/participants/{participant_id}/documents/stats")
def get_document_stats(
    participant_id: int,
    db: Session = Depends(get_db)
):
    """Get document statistics for a participant"""
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

@router.get("/participants/{participant_id}/documents/{document_id}")
def get_document(
    participant_id: int,
    document_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get a specific document"""
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.participant_id == participant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Log access
        DocumentService.log_document_access(
            db=db,
            document_id=document.id,
            user_id=1,  # Replace with actual user ID from auth
            user_role="admin",
            access_type="view",
            ip_address=request.client.host if request.client else None
        )
        
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
    inline: bool = False,  # THIS IS THE KEY PARAMETER FOR PREVIEW
    db: Session = Depends(get_db)
):
    """Download or preview a document file - FIXED VERSION WITH PROPER INLINE SUPPORT"""
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
        
        # Check if file exists and normalize path
        file_path = Path(document.file_path)
        
        # If the path is relative, make it absolute from the current working directory
        if not file_path.is_absolute():
            file_path = Path.cwd() / file_path
            
        logger.info(f"Resolved file path: {file_path}")
        logger.info(f"File exists: {file_path.exists()}")
        
        if not file_path.exists():
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
                    file_path = alt_path
                    break
            else:
                # If still not found, list directory contents for debugging
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
        
        # Log access
        try:
            access_type = "preview" if inline else "download"
            DocumentService.log_document_access(
                db=db,
                document_id=document.id,
                user_id=1,  # Replace with actual user ID from auth
                user_role="admin",
                access_type=access_type,
                ip_address=request.client.host if request.client else None
            )
        except Exception as e:
            logger.warning(f"Failed to log document access: {e}")
        
        # THIS IS THE KEY PART - Set appropriate headers based on whether it's for preview or download
        headers = {}
        
        if inline:
            # For preview - display inline in browser (THIS FIXES THE DOWNLOAD ISSUE)
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
        raise HTTPException(status_code=500, detail=f"Error {'previewing' if inline else 'downloading'} document: {str(e)}")

@router.delete("/participants/{participant_id}/documents/{document_id}")
def delete_document(
    participant_id: int,
    document_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Delete a document"""
    try:
        success = DocumentService.delete_document(
            db=db,
            document_id=document_id,
            participant_id=participant_id
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Log access
        try:
            DocumentService.log_document_access(
                db=db,
                document_id=document_id,
                user_id=1,  # Replace with actual user ID from auth
                user_role="admin",
                access_type="delete",
                ip_address=request.client.host if request.client else None
            )
        except Exception as e:
            logger.warning(f"Failed to log document access: {e}")
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/organization-stats")
def get_organization_document_stats(db: Session = Depends(get_db)):
    """Get organization-wide document statistics"""
    try:
        stats = DocumentService.get_organization_document_stats(db)
        return stats
    except Exception as e:
        logger.error(f"Error fetching organization document stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/expiring")
def get_expiring_documents(
    days_ahead: int = 30,
    participant_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get documents expiring within specified days"""
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
    """Get expired documents"""
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
    """Update document metadata"""
    try:
        document = db.query(Document).filter(
            and_(
                Document.id == document_id,
                Document.participant_id == participant_id
            )
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update fields if provided
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
            try:
                tag_list = json.loads(tags) if tags.startswith('[') else [tag.strip() for tag in tags.split(',')]
                updates['tags'] = tag_list
            except:
                updates['tags'] = [tag.strip() for tag in tags.split(',') if tag.strip()]
                
        if visible_to_support_worker is not None:
            updates['visible_to_support_worker'] = visible_to_support_worker
            
        if expiry_date is not None:
            try:
                if expiry_date == "":
                    updates['expiry_date'] = None
                else:
                    # Parse the date and ensure it's timezone-naive
                    if 'T' in expiry_date:
                        date_part = expiry_date.split('T')[0]
                        updates['expiry_date'] = datetime.strptime(date_part, '%Y-%m-%d')
                    else:
                        updates['expiry_date'] = datetime.strptime(expiry_date, '%Y-%m-%d')
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid expiry date format. Expected YYYY-MM-DD")
        
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