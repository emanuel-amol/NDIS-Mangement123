# backend/app/api/v1/endpoints/files.py - FIXED TO HANDLE TEMPORARY REFERRAL IDs
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import os
import uuid
import mimetypes
from pathlib import Path
from datetime import datetime, timezone
import logging

from app.core.database import get_db
from app.core.config import settings
from app.models.document import Document
from app.models.referral import Referral
from app.models.participant import Participant
from app.services.storage.cos_storage_ibm import (
    object_key,
    put_bytes,
    delete_object,
    copy_object,
)

# Create the router - THIS IS CRITICAL FOR IMPORT
router = APIRouter()
logger = logging.getLogger(__name__)

# Configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".txt",
    ".zip",
    ".eml",
    ".heic",
}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/heic",
    "message/rfc822",
}
MAX_FILE_SIZE_MB = settings.COS_MAX_UPLOAD_MB
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

def validate_file(file: UploadFile, file_size: int) -> None:
    """Validate uploaded file content type, extension, and size."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext and file_ext not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not allowed. Allowed extensions: {allowed}",
        )

    content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        allowed_types = ", ".join(sorted(ALLOWED_MIME_TYPES))
        raise HTTPException(
            status_code=400,
            detail=f"File type {content_type} not supported. Allowed types: {allowed_types}",
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE_MB}MB",
        )

def is_temporary_referral_id(referral_id: int) -> bool:
    """Check if this is a temporary referral ID (timestamp-based)"""
    # Temporary IDs are timestamps, so they're large numbers (1600000000+ for dates after 2020)
    # Real referral IDs start from 1 and increment
    return referral_id > 1000000000

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    description: str = Form("Uploaded with form"),
    referral_id: Optional[int] = Form(None),
    participant_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload a file that can be associated with either a referral or participant.
    Handles temporary referral IDs for file uploads before referral creation.
    """
    uploaded_key: Optional[str] = None
    try:
        logger.info(f"File upload request: referral_id={referral_id}, participant_id={participant_id}")
        
        # Validate that at least one ID is provided
        if not referral_id and not participant_id:
            raise HTTPException(
                status_code=400, 
                detail="Either referral_id or participant_id must be provided"
            )

        file_bytes = await file.read()
        file_size = len(file_bytes or b"")
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        validate_file(file, file_size)

        # Determine COS prefix and validate entities
        resolved_referral_id: Optional[int] = None
        temp_referral = False
        prefix = "misc/"

        if referral_id:
            if is_temporary_referral_id(referral_id):
                logger.info(f"Using temporary referral ID: {referral_id}")
                temp_referral = True
                prefix = f"temp_referrals/{referral_id}/"
            else:
                referral = db.query(Referral).filter(Referral.id == referral_id).first()
                if not referral:
                    raise HTTPException(status_code=404, detail="Referral not found")
                resolved_referral_id = referral_id
                prefix = f"referrals/{referral_id}/"

        if participant_id:
            participant = db.query(Participant).filter(Participant.id == participant_id).first()
            if not participant:
                raise HTTPException(status_code=404, detail="Participant not found")
            prefix = f"participants/{participant_id}/"

        original_name = file.filename or f"upload-{uuid.uuid4().hex}"
        content_type = file.content_type or mimetypes.guess_type(original_name)[0] or "application/octet-stream"
        storage_key = object_key(prefix, original_name)
        put_bytes(storage_key, file_bytes, content_type=content_type)
        uploaded_key = storage_key

        extra_metadata: Dict[str, Any] = {"storage_key": storage_key}
        if temp_referral and referral_id:
            extra_metadata["temp_referral_id"] = referral_id

        document = Document(
            file_id=str(uuid.uuid4()),
            participant_id=participant_id,
            referral_id=resolved_referral_id,
            title=original_name,
            filename=original_name,
            original_filename=original_name,
            file_path=None,
            file_url=None,
            mime_type=content_type,
            file_size=file_size,
            description=description,
            document_type=None,
            category=None,
            tags=[],
            visible_to_support_worker=False,
            is_current_version=True,
            is_active=True,
            is_confidential=False,
            requires_approval=False,
            status="pending" if temp_referral else "active",
            version=1,
            uploaded_by="Referral Form Upload" if referral_id and not participant_id else "System Upload",
            uploaded_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            storage_provider="ibm-cos",
            storage_key=storage_key,
            extra_metadata=extra_metadata,
        )

        db.add(document)
        db.flush()
        document.file_url = f"/api/v1/documents/{document.id}/download-cos"
        db.commit()
        db.refresh(document)

        logger.info(
            "Document created with ID %s (temp_referral_id=%s) stored in IBM COS key %s",
            document.id,
            referral_id if temp_referral else "None",
            storage_key,
        )

        return JSONResponse(
            status_code=200,
            content={
                "message": "File uploaded successfully",
                "file": {
                    "file_id": document.file_id,
                    "original_name": document.original_filename,
                    "file_url": document.file_url,
                    "file_size": document.file_size,
                    "file_type": document.mime_type,
                    "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
                    "description": document.description,
                    "referral_id": referral_id,
                    "participant_id": document.participant_id,
                    "status": document.status,
                    "is_temporary": temp_referral,
                    "storage_key": document.storage_key,
                    "storage_provider": document.storage_provider,
                },
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload error: {e}")
        if uploaded_key:
            try:
                delete_object(uploaded_key)
            except Exception as cleanup_error:
                logger.warning(f"Failed to clean up COS object {uploaded_key}: {cleanup_error}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.get("/{filename}")
async def download_file(filename: str):
    """Download a file by filename"""
    # Search for file in all subdirectories including temp folders
    possible_paths = [
        UPLOAD_DIR / filename,
        UPLOAD_DIR / "referrals" / filename,
        UPLOAD_DIR / "participants" / filename,
        UPLOAD_DIR / "temp_referrals" / filename
    ]
    
    # Also search all subdirectories
    for subdir in UPLOAD_DIR.glob("**/"):
        if subdir.is_dir():
            possible_paths.append(subdir / filename)
    
    for file_path in possible_paths:
        if file_path.exists():
            return FileResponse(
                path=str(file_path),
                filename=filename,
                media_type="application/octet-stream"
            )
    
    raise HTTPException(status_code=404, detail="File not found")

@router.delete("/file/{file_id}")
async def delete_file(
    file_id: str,
    referral_id: Optional[int] = None,
    participant_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Delete a file by file_id"""
    try:
        # Find document record
        query = db.query(Document).filter(Document.file_id == file_id)
        
        # Handle temporary referral IDs
        if referral_id and is_temporary_referral_id(referral_id):
            # For temp referral IDs, find by temp_referral_id in metadata
            documents = query.all()
            document = None
            for doc in documents:
                if doc.extra_metadata and doc.extra_metadata.get("temp_referral_id") == referral_id:
                    document = doc
                    break
        else:
            if referral_id:
                query = query.filter(Document.referral_id == referral_id)
            if participant_id:
                query = query.filter(Document.participant_id == participant_id)
            document = query.first()
        
        if not document:
            raise HTTPException(status_code=404, detail="File not found")

        # Delete from IBM COS when applicable
        if document.storage_provider == "ibm-cos":
            cos_key = document.storage_key or (document.extra_metadata or {}).get("storage_key")
            if cos_key:
                try:
                    delete_object(cos_key)
                    logger.info("Deleted COS object for file_id=%s key=%s", file_id, cos_key)
                except Exception as cos_error:
                    logger.warning("Failed to delete COS object %s: %s", cos_key, cos_error)
        else:
            # Fallback to local file removal for legacy documents
            try:
                if document.file_path and os.path.exists(document.file_path):
                    os.remove(document.file_path)
                    logger.info(f"Physical file deleted: {document.file_path}")
            except Exception as e:
                logger.warning(f"Could not delete physical file: {e}")

        # Delete database record
        db.delete(document)
        db.commit()
        
        return {"message": "File deleted successfully", "file_id": file_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

@router.post("/associate-temp-files/{real_referral_id}")
async def associate_temp_files_with_referral(
    real_referral_id: int,
    temp_referral_id: int,
    db: Session = Depends(get_db)
):
    """Associate temporarily uploaded files with a real referral after it's created"""
    try:
        # Verify the real referral exists
        referral = db.query(Referral).filter(Referral.id == real_referral_id).first()
        if not referral:
            raise HTTPException(status_code=404, detail="Referral not found")
        
        # Find all documents with the temp referral ID in metadata
        documents = db.query(Document).filter(
            Document.extra_metadata.contains({"temp_referral_id": temp_referral_id})
        ).all()
        
        logger.info(f"Found {len(documents)} temp files to associate with referral {real_referral_id}")

        files_moved = 0

        for doc in documents:
            metadata = (doc.extra_metadata or {}).copy()
            old_key = metadata.get("storage_key") or doc.storage_key

            if old_key and old_key.startswith(f"temp_referrals/{temp_referral_id}"):
                new_key = object_key(f"referrals/{real_referral_id}/", os.path.basename(old_key))
                try:
                    copy_object(old_key, new_key)
                    files_moved += 1
                    logger.info("Moved COS object from %s to %s", old_key, new_key)
                except Exception as move_error:
                    logger.error("Failed to move COS object from %s to %s: %s", old_key, new_key, move_error)
                    raise HTTPException(status_code=500, detail="Failed to move referral files in storage")
            else:
                new_key = old_key

            if "temp_referral_id" in metadata:
                metadata.pop("temp_referral_id", None)

            if new_key:
                metadata["storage_key"] = new_key
                doc.storage_key = new_key

            doc.extra_metadata = metadata
            doc.referral_id = real_referral_id
            doc.status = "active"
            doc.storage_provider = "ibm-cos"
            doc.file_url = f"/api/v1/documents/{doc.id}/download-cos"

        db.commit()

        return {
            "message": f"Successfully associated {len(documents)} files with referral {real_referral_id}",
            "files_associated": len(documents),
            "files_moved": files_moved,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error associating temp files: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to associate files: {str(e)}")

@router.get("/referral/{referral_id}/files")
async def get_referral_files(referral_id: int, db: Session = Depends(get_db)):
    """Get all files for a referral (including temporary files)"""
    try:
        files = []
        
        if is_temporary_referral_id(referral_id):
            # Find temp files by metadata
            documents = db.query(Document).filter(
                Document.extra_metadata.contains({"temp_referral_id": referral_id})
            ).all()
        else:
            # Find real referral files
            referral = db.query(Referral).filter(Referral.id == referral_id).first()
            if not referral:
                raise HTTPException(status_code=404, detail="Referral not found")
            documents = db.query(Document).filter(Document.referral_id == referral_id).all()
        
        return {
            "referral_id": referral_id,
            "is_temporary": is_temporary_referral_id(referral_id),
            "files": [
                {
                    "file_id": doc.file_id,
                    "original_name": doc.original_filename,
                    "file_url": doc.file_url,
                    "file_size": doc.file_size,
                    "file_type": doc.mime_type,
                    "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                    "description": doc.description,
                    "status": doc.status
                }
                for doc in documents
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting referral files: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get files: {str(e)}")

@router.get("/participant/{participant_id}/files")
async def get_participant_files(participant_id: int, db: Session = Depends(get_db)):
    """Get all files for a participant"""
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    files = db.query(Document).filter(Document.participant_id == participant_id).all()
    
    return {
        "participant_id": participant_id,
        "files": [
            {
                "file_id": doc.file_id,
                "original_name": doc.original_filename,
                "file_url": doc.file_url,
                "file_size": doc.file_size,
                "file_type": doc.mime_type,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                "description": doc.description
            }
            for doc in files
        ]
    }

@router.get("/health")
async def files_health_check():
    """Health check for files service"""
    return {
        "status": "healthy",
        "upload_directory": str(UPLOAD_DIR),
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "allowed_extensions": list(ALLOWED_EXTENSIONS),
        "supports_temporary_referrals": True
    }

# Make sure router is exported
__all__ = ["router"]
