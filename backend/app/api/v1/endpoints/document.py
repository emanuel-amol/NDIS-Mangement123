# backend/app/api/v1/endpoints/document.py - COMPLETE FIXED VERSION
"""
Complete Document Management API
Combines IBM COS storage with local file storage and version control
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Query
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta, timezone
from pathlib import Path
import os
import uuid
import shutil
import json
import logging

# Internal imports
from app.dependencies import get_db
from app.models.participant import Participant
from app.models.document import Document, DocumentCategory, DocumentAccess
from app.models.document_workflow import DocumentVersion
from app.services.document_service import DocumentService
from app.services.enhanced_document_service import EnhancedDocumentService
from app.services.enhanced_version_control_service import EnhancedVersionControlService
from app.services.storage.cos_storage_ibm import object_key, put_bytes, get_object_stream, delete_object, generate_presigned_url
from app.core.config import settings

# Configuration and Setup
router = APIRouter()
logger = logging.getLogger(__name__)

# Upload configuration for local storage
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
    return 1, "system_user"


def validate_file(file: UploadFile) -> Optional[str]:
    """Validate uploaded file size and type."""
    if getattr(file, "size", None) and file.size > MAX_FILE_SIZE:
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

    except Exception:
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
    except Exception:
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


def _normalized_title(title: str | None, fallback: str | None) -> str:
    """Normalize a title for matching (case-insensitive, trimmed)."""
    base = (title or fallback or "").strip().lower()
    return base


def _version_preview_url(v: DocumentVersion) -> str:
    """Build a preview URL for a version, supporting COS or local."""
    # Prefer COS signed URL if storage_key is present on the version (or baked into file_path)
    sk = getattr(v, "storage_key", None)
    if sk:
        return generate_presigned_url(sk, expires_in=900)  # 15 minutes

    # Some implementations store the COS key in file_path for versions. If it "looks like" a key, still sign it.
    if v.file_path and not os.path.isabs(v.file_path) and "/" in v.file_path and not os.path.exists(v.file_path):
        try:
            return generate_presigned_url(v.file_path, expires_in=900)
        except Exception:
            pass

    # Local fallback via your file preview endpoint (implement in files.py if needed)
    return f"/api/v1/files/preview?path={v.file_path}"


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
    if not participant_id and not referral_id:
        raise HTTPException(status_code=400, detail="participant_id or referral_id required")

    # Size validation
    contents = await file.read()
    max_bytes = settings.COS_MAX_UPLOAD_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {settings.COS_MAX_UPLOAD_MB} MB"
        )

    # Build storage path
    prefix_parts = []
    if participant_id:
        prefix_parts.append(f"participants/{participant_id}")
    if referral_id:
        prefix_parts.append(f"referrals/{referral_id}")
    prefix = "/".join(prefix_parts) or "misc"

    # Upload to COS
    key = object_key(prefix, file.filename)
    put_bytes(key, contents, file.content_type)

    # Create database record
    doc = Document(
        file_id=str(uuid.uuid4()),
        participant_id=participant_id,
        referral_id=referral_id,
        title=file.filename,
        filename=file.filename,
        original_filename=file.filename,
        storage_provider="ibm-cos",
        storage_key=key,
        file_size=len(contents),
        mime_type=file.content_type,
        status="available",
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(doc)
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
    storage_type: str = Form("local"),
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

        tag_list = parse_tags(tags)
        expiry_datetime = parse_expiry_date(expiry_date) if expiry_date else None

        # --- FIX: find existing by (participant, category, normalized title) ---
        norm_title = _normalized_title(title, file.filename)
        logger.info(f"Looking for existing document with title: '{norm_title}' in category '{category}' for participant {participant_id}")

        existing_document = db.query(Document).filter(
            and_(
                Document.participant_id == participant_id,
                Document.category == category,
                func.lower(func.coalesce(Document.title, Document.original_filename)) == norm_title,
                Document.status.in_(["active", "pending_approval"])
            )
        ).order_by(Document.created_at.desc()).first()

        if existing_document:
            logger.info(f"Document '{title}' exists (ID: {existing_document.id}). Creating new version.")

            # guarantee an initial version exists (if legacy docs were missing versions)
            if not db.query(DocumentVersion).filter(DocumentVersion.document_id == existing_document.id).first():
                try:
                    initial = DocumentVersion(
                        document_id=existing_document.id,
                        version_number=1,
                        filename=existing_document.filename,
                        file_path=existing_document.file_path,
                        file_size=existing_document.file_size,
                        mime_type=existing_document.mime_type,
                        changes_summary="Initial version (backfilled)",
                        created_by="System User",
                        change_metadata={"change_type": "initial", "backfilled": True}
                    )
                    db.add(initial)
                    existing_document.version = 1
                    db.commit()
                except Exception as e:
                    logger.warning(f"Failed to backfill initial version for doc {existing_document.id}: {e}")

            # --- store the new binary ---
            if storage_type == "cos":
                contents = await file.read()
                prefix = f"participants/{participant_id}"
                key = object_key(prefix, file.filename)
                put_bytes(key, contents, file.content_type)
                # for versions we keep the key in file_path (consistent with initial)
                file_path = key
                filename = file.filename
                file_size = len(contents)
            else:
                # Save to versions subdirectory for version uploads
                file_extension = Path(file.filename).suffix if file.filename else ""
                unique_filename = f"{participant_id}_{existing_document.id}_{uuid.uuid4().hex}{file_extension}"

                versions_dir = Path("uploads/documents") / str(participant_id) / "versions"
                versions_dir.mkdir(parents=True, exist_ok=True)
                version_file_path = versions_dir / unique_filename

                with open(version_file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)

                filename = unique_filename
                file_path = str(version_file_path.absolute())
                file_size = getattr(file, "size", 0)

                logger.info(f"Saved version file to: {file_path}")

            # --- register the version ---
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
                        "affected_fields": ["file_content", "description", "tags"] if (description or tags) else ["file_content"],
                        "storage_type": storage_type
                    }
                )
            except Exception as version_error:
                logger.error(f"Error creating version for document {existing_document.id}: {str(version_error)}")
                # Clean up uploaded file on error
                if storage_type == "local" and 'version_file_path' in locals():
                    try:
                        os.remove(version_file_path)
                    except Exception:
                        pass
                raise HTTPException(status_code=500, detail=f"Failed to create version: {str(version_error)}")

            # update “current” document pointers
            if description is not None:
                existing_document.description = description
            if tag_list:
                existing_document.tags = tag_list
            if expiry_datetime:
                existing_document.expiry_date = expiry_datetime

            existing_document.filename = filename
            existing_document.file_path = file_path
            existing_document.file_size = file_size
            existing_document.mime_type = file.content_type
            existing_document.visible_to_support_worker = visible_to_support_worker
            existing_document.updated_at = datetime.now(timezone.utc)
            existing_document.version = (existing_document.version or 1) + 1

            if storage_type == "cos":
                existing_document.storage_provider = "ibm-cos"
                existing_document.storage_key = file_path  # using key in file_path for consistency

            db.commit()
            db.refresh(existing_document)

            log_document_access_safe(db, existing_document.id, "version_upload", request)

            logger.info(f"Successfully created version {new_version.version_number} for document {existing_document.id}")

            response_data = format_document_response(existing_document, participant_id)
            response_data["version_info"] = {
                "new_version_id": new_version.id,
                "version_number": new_version.version_number,
                "is_new_version": True,
                "changes_summary": new_version.changes_summary
            }

            return response_data

        else:
            logger.info(f"Creating new document '{title}' for participant {participant_id}")

            if storage_type == "cos":
                contents = await file.read()
                prefix = f"participants/{participant_id}"
                key = object_key(prefix, file.filename)
                put_bytes(key, contents, file.content_type)
                filename = file.filename
                file_path = key
                file_size = len(contents)
            else:
                filename, file_path = save_uploaded_file(file, participant_id)
                file_size = getattr(file, "size", 0)

            document, workflow = EnhancedDocumentService.create_document_with_workflow(
                db=db,
                participant_id=participant_id,
                title=title,
                filename=filename,
                original_filename=file.filename,
                file_path=file_path,
                file_size=file_size,
                mime_type=file.content_type,
                category=category,
                description=description,
                tags=tag_list,
                visible_to_support_worker=visible_to_support_worker,
                expiry_date=expiry_datetime,
                uploaded_by="System User",
                requires_approval=requires_approval
            )

            document.storage_provider = storage_type
            if storage_type == "cos":
                document.storage_key = file_path  # key
                document.file_id = str(uuid.uuid4())

            # Create initial version with correct path structure
            initial_version = DocumentVersion(
                document_id=document.id,
                version_number=1,
                filename=filename,
                file_path=file_path,
                file_size=file_size,
                mime_type=file.content_type,
                changes_summary="Initial version",
                created_by="System User",
                change_metadata={
                    "change_type": "initial",
                    "changed_fields": [],
                    "file_size_change": 0,
                    "storage_type": storage_type
                }
            )
            db.add(initial_version)
            document.version = 1
            db.commit()
            db.refresh(initial_version)

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
# VERSION HISTORY + COMPARE (for modal)
# ==========================================

@router.get("/participants/{participant_id}/documents/{document_id}/versions")
def list_document_versions(
    participant_id: int,
    document_id: int,
    db: Session = Depends(get_db)
):
    """
    Return all versions for a document with preview URLs the frontend can open.
    """
    doc = db.query(Document).filter(
        and_(Document.id == document_id, Document.participant_id == participant_id)
    ).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    versions = db.query(DocumentVersion).filter(
        DocumentVersion.document_id == document_id
    ).order_by(DocumentVersion.version_number.desc()).all()

    if not versions:
        # backfill initial, just in case legacy doc has none
        initial = DocumentVersion(
            document_id=document_id,
            version_number=1,
            filename=doc.filename,
            file_path=doc.file_path,
            file_size=doc.file_size,
            mime_type=doc.mime_type,
            changes_summary="Initial version (backfilled)",
            created_by="System User",
            change_metadata={"change_type": "initial", "backfilled": True}
        )
        db.add(initial)
        doc.version = 1
        db.commit()
        versions = [initial]

    def row(v: DocumentVersion) -> Dict[str, Any]:
        return {
            "id": v.id,
            "version_number": v.version_number,
            "filename": v.filename,
            "mime_type": v.mime_type,
            "file_size": v.file_size,
            "created_at": v.created_at.isoformat() if v.created_at else None,
            "created_by": v.created_by,
            "changes_summary": v.changes_summary,
            "preview_url": _version_preview_url(v),
        }

    return [row(v) for v in versions]


@router.get("/participants/{participant_id}/documents/{document_id}/versions/{v1}/compare/{v2}")
def compare_document_versions(
    participant_id: int,
    document_id: int,
    v1: int,
    v2: int,
    db: Session = Depends(get_db)
):
    """
    Return both preview URLs plus a diff summary so the UI can render side-by-side.
    """
    doc = db.query(Document).filter(
        and_(Document.id == document_id, Document.participant_id == participant_id)
    ).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    left = db.query(DocumentVersion).filter(
        and_(DocumentVersion.id == v1, DocumentVersion.document_id == document_id)
    ).first()
    right = db.query(DocumentVersion).filter(
        and_(DocumentVersion.id == v2, DocumentVersion.document_id == document_id)
    ).first()

    if not (left and right):
        raise HTTPException(404, "One or both versions not found")

    # delegate diff summary to your existing service (it can be simple/no-op)
    try:
        summary = EnhancedVersionControlService.compare_versions(db, document_id, v1, v2) or {}
    except Exception as e:
        logger.warning(f"compare_versions failed or not implemented deeply, returning minimal payload: {e}")
        summary = {"differences": {}}

    return {
        "left": {
            "version_id": v1,
            "version_number": left.version_number,
            "filename": left.filename,
            "mime_type": left.mime_type,
            "preview_url": _version_preview_url(left),
        },
        "right": {
            "version_id": v2,
            "version_number": right.version_number,
            "filename": right.filename,
            "mime_type": right.mime_type,
            "preview_url": _version_preview_url(right),
        },
        "diff": summary.get("differences", {}),
    }


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
