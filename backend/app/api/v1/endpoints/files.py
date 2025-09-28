# backend/app/api/v1/endpoints/files.py - COMPLETE FILE UPLOAD ENDPOINT
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.document import Document
import os
import uuid
from datetime import datetime, timezone
from typing import Optional
import logging
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

router = APIRouter()

# Configure upload directory
BASE_UPLOAD_DIR = Path(__file__).resolve().parents[4] / 'uploads'
BASE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = str(BASE_UPLOAD_DIR)

# Allowed file types and size limits
ALLOWED_EXTENSIONS = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.txt': 'text/plain'
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_file(file: UploadFile) -> tuple[bool, str]:
    """Validate file type and size"""
    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        return False, f"File {file.filename} is too large. Maximum size: 10MB"
    
    # Check file extension
    if file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"File {file.filename} has unsupported format. Allowed: PDF, images, Word documents, text files"
        
        # Verify content type matches extension
        expected_content_type = ALLOWED_EXTENSIONS[ext]
        if file.content_type and not file.content_type.startswith(expected_content_type.split('/')[0]):
            return False, f"File {file.filename} content type doesn't match extension"
    
    return True, ""

@router.post("/upload", response_model=dict)
async def upload_file(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    referral_id: Optional[int] = Form(None),
    participant_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a file and store metadata in database"""
    try:
        # Validate file
        is_valid, error_message = validate_file(file)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Ensure upload directory exists
        Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
        
        # Save file to disk
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            logger.error(f"Error saving file to disk: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save file")
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Create database record
        timestamp = datetime.now(timezone.utc)
        original_name = file.filename or "uploaded_file"

        file_record = Document(
            file_id=str(uuid.uuid4()),
            participant_id=participant_id,
            referral_id=referral_id,
            title=original_name,
            filename=unique_filename,
            original_filename=original_name,
            file_path=file_path,
            file_url=f"/api/v1/files/{unique_filename}",
            file_size=file_size,
            file_type=file.content_type or "application/octet-stream",
            description=description or "",
            status="active",
            uploaded_by="Referral Form Upload",
            uploaded_at=timestamp,
            created_at=timestamp
        )
        
        db.add(file_record)
        db.commit()
        db.refresh(file_record)
        
        logger.info(f"File uploaded successfully: {file.filename} (ID: {file_record.file_id})")
        
        return {
            "file": {
                "file_id": file_record.file_id,
                "original_name": file_record.original_name,
                "file_url": file_record.file_url,
                "file_size": file_record.file_size,
                "file_type": file_record.file_type,
                "uploaded_at": file_record.uploaded_at.isoformat(),
                "description": file_record.description
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        # Clean up file if database operation failed
        if 'file_path' in locals() and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.get("/{filename}")
async def download_file(filename: str):
    """Download a file by filename"""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )

@router.delete("/file/{file_id}")
async def delete_file(
    file_id: str,
    referral_id: Optional[int] = None,
    participant_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Delete a file and its database record"""
    try:
        # Find file record
        query = db.query(Document).filter(Document.file_id == file_id)
        
        # Add additional filters if provided
        if referral_id:
            query = query.filter(Document.referral_id == referral_id)
        if participant_id:
            query = query.filter(Document.participant_id == participant_id)
            
        file_record = query.first()
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Delete physical file
        if os.path.exists(file_record.file_path):
            try:
                os.remove(file_record.file_path)
                logger.info(f"Physical file deleted: {file_record.file_path}")
            except Exception as e:
                logger.warning(f"Could not delete physical file {file_record.file_path}: {str(e)}")
        
        # Delete database record
        db.delete(file_record)
        db.commit()
        
        logger.info(f"File record deleted: {file_id}")
        
        return {"message": "File deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File deletion failed: {str(e)}")

@router.get("/referral/{referral_id}/files")
async def get_referral_files(referral_id: int, db: Session = Depends(get_db)):
    """Get all files associated with a referral"""
    files = db.query(Document).filter(Document.referral_id == referral_id).all()
    return [
        {
            "file_id": f.file_id,
            "original_name": f.original_name,
            "file_url": f.file_url,
            "file_size": f.file_size,
            "file_type": f.file_type,
            "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
            "description": f.description
        }
        for f in files
    ]

@router.get("/participant/{participant_id}/files")
async def get_participant_files(participant_id: int, db: Session = Depends(get_db)):
    """Get all files associated with a participant"""
    files = db.query(Document).filter(Document.participant_id == participant_id).all()
    return [
        {
            "file_id": f.file_id,
            "original_name": f.original_name,
            "file_url": f.file_url,
            "file_size": f.file_size,
            "file_type": f.file_type,
            "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
            "description": f.description
        }
        for f in files
    ]

@router.get("/health")
async def files_health_check():
    """Health check for files service"""
    upload_dir_exists = os.path.exists(UPLOAD_DIR)
    upload_dir_writable = os.access(UPLOAD_DIR, os.W_OK) if upload_dir_exists else False
    
    return {
        "status": "healthy" if upload_dir_exists and upload_dir_writable else "unhealthy",
        "upload_directory": UPLOAD_DIR,
        "upload_directory_exists": upload_dir_exists,
        "upload_directory_writable": upload_dir_writable,
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "allowed_extensions": list(ALLOWED_EXTENSIONS.keys())
    }


