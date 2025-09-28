# backend/app/api/v1/endpoints/files.py - FIXED TO HANDLE TEMPORARY REFERRAL IDs
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
import os
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone
import logging

from app.core.database import get_db
from app.models.document import Document
from app.models.referral import Referral
from app.models.participant import Participant

# Create the router - THIS IS CRITICAL FOR IMPORT
router = APIRouter()
logger = logging.getLogger(__name__)

# Configuration
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file_ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check file size if available
    if hasattr(file, 'size') and file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )

def save_file(file: UploadFile, subfolder: str = "") -> tuple[str, str]:
    """Save uploaded file and return (filename, filepath)"""
    # Create unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    
    # Create full path
    if subfolder:
        save_dir = UPLOAD_DIR / subfolder
        save_dir.mkdir(parents=True, exist_ok=True)
    else:
        save_dir = UPLOAD_DIR
    
    file_path = save_dir / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info(f"File saved to: {file_path}")
        return unique_filename, str(file_path.absolute())
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

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
    try:
        logger.info(f"File upload request: referral_id={referral_id}, participant_id={participant_id}")
        
        # Validate that at least one ID is provided
        if not referral_id and not participant_id:
            raise HTTPException(
                status_code=400, 
                detail="Either referral_id or participant_id must be provided"
            )
        
        # Validate file
        validate_file(file)
        
        # Handle referral validation - FIXED FOR TEMPORARY IDs
        if referral_id:
            if is_temporary_referral_id(referral_id):
                logger.info(f"Using temporary referral ID: {referral_id}")
                # For temporary referral IDs, we'll store the file but mark it as pending
                subfolder = f"temp_referrals/{referral_id}"
                referral_exists = True  # Allow temporary referrals
            else:
                # Real referral ID - verify it exists
                referral = db.query(Referral).filter(Referral.id == referral_id).first()
                if not referral:
                    raise HTTPException(status_code=404, detail="Referral not found")
                subfolder = f"referrals/{referral_id}"
                referral_exists = True
        
        # Handle participant validation
        if participant_id:
            participant = db.query(Participant).filter(Participant.id == participant_id).first()
            if not participant:
                raise HTTPException(status_code=404, detail="Participant not found")
            
            # If both referral and participant provided, use participant folder
            if referral_id and participant_id:
                subfolder = f"participants/{participant_id}"
            elif participant_id and not referral_id:
                subfolder = f"participants/{participant_id}"
        
        # If only temporary referral_id is provided
        if referral_id and not participant_id and is_temporary_referral_id(referral_id):
            subfolder = f"temp_referrals/{referral_id}"
        
        # Save file
        filename, file_path = save_file(file, subfolder)
        
        # Create document record - MODIFIED FOR TEMPORARY REFERRAL IDs
        document = Document(
            file_id=str(uuid.uuid4()),
            participant_id=participant_id,  # Can be None for referral-only uploads
            referral_id=referral_id if not is_temporary_referral_id(referral_id) else None,  # Don't store temp IDs
            title=file.filename,
            filename=filename,
            original_filename=file.filename,
            file_path=file_path,
            file_url=f"/api/v1/files/{filename}",
            mime_type=file.content_type,
            file_size=file.size if hasattr(file, 'size') and file.size else 0,
            description=description,
            document_type=None,
            category=None,
            tags=[],
            visible_to_support_worker=False,
            is_current_version=True,
            is_active=True,
            is_confidential=False,
            requires_approval=False,
            status="pending" if is_temporary_referral_id(referral_id) else "active",  # Mark temp uploads as pending
            version=1,
            uploaded_by="Referral Form Upload" if referral_id and not participant_id else "System Upload",
            uploaded_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            extra_metadata={
                "temp_referral_id": referral_id if is_temporary_referral_id(referral_id) else None,
                "upload_session": str(uuid.uuid4())  # Track upload session
            }
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        logger.info(f"Document created with ID: {document.id} (temp_referral_id: {referral_id if is_temporary_referral_id(referral_id) else 'None'})")
        
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
                    "uploaded_at": document.uploaded_at.isoformat(),
                    "description": document.description,
                    "referral_id": referral_id,  # Return the original referral_id (even if temp)
                    "participant_id": document.participant_id,
                    "status": document.status,
                    "is_temporary": is_temporary_referral_id(referral_id) if referral_id else False
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload error: {e}")
        # Clean up file if it was saved
        if 'file_path' in locals() and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
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
        
        # Delete physical file
        try:
            if os.path.exists(document.file_path):
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
        
        # Update documents to reference the real referral
        for doc in documents:
            doc.referral_id = real_referral_id
            doc.status = "active"  # Change from pending to active
            # Update metadata to remove temp referral ID
            if doc.extra_metadata:
                doc.extra_metadata.pop("temp_referral_id", None)
            
        db.commit()
        
        return {
            "message": f"Successfully associated {len(documents)} files with referral {real_referral_id}",
            "files_associated": len(documents)
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