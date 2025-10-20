# backend/app/api/v1/endpoints/document_versions.py - FIXED UPLOAD PATH
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from app.core.database import get_db
from app.models.document import Document
from app.models.document_workflow import DocumentVersion, DocumentApproval
from app.models.user import User
from app.api.deps import get_current_active_user
from app.services.storage.cos_storage_ibm import object_key, put_bytes, get_object_stream, delete_object
from app.core.config import settings
from typing import List, Optional
from datetime import datetime, timezone
import logging
import os
import uuid
import hashlib
import mimetypes
from pathlib import Path

router = APIRouter()
logger = logging.getLogger(__name__)

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


def log_document_access_safe(
    db: Session,
    document_id: int,
    access_type: str,
    request: Request,
    current_user: Optional[User] = None,
):
    """Safely log document access with error handling."""
    try:
        from app.services.document_service import DocumentService

        user_id = current_user.id if current_user else None
        user_role = None
        if current_user:
            role_attr = getattr(current_user, "role", None)
            user_role = getattr(role_attr, "value", role_attr)

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


@router.get("/documents/{document_id}/versions")
def get_document_versions(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get all versions of a document"""
    try:
        # Check if document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get all versions for this document
        versions = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(desc(DocumentVersion.version_number)).all()
        
        # If no versions exist, create one for the current document
        if not versions:
            current_version = DocumentVersion(
                document_id=document_id,
                version_number=1,
                filename=document.filename,
                file_path=document.file_path,
                file_size=document.file_size,
                mime_type=document.mime_type,
                changes_summary="Initial version",
                created_by=document.uploaded_by
            )
            db.add(current_version)
            db.commit()
            db.refresh(current_version)
            versions = [current_version]
        
        # Format response
        return [
            {
                "id": version.id,
                "version_number": version.version_number,
                "filename": version.filename,
                "file_size": version.file_size,
                "mime_type": version.mime_type,
                "changes_summary": version.changes_summary or "No changes summary",
                "created_at": version.created_at.isoformat() if version.created_at else None,
                "created_by": version.created_by,
                "is_current": version.replaced_by_version_id is None
            }
            for version in versions
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document versions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch document versions")


@router.post("/documents/{document_id}/versions/upload")
async def upload_new_version(
    document_id: int,
    request: Request,
    file: UploadFile = File(...),
    changes_summary: str = Form(...),
    change_reason: Optional[str] = Form(None),
    storage_type: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a new version of an existing document"""
    try:
        # Check if document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Validate file
        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File size exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit")
        
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail=f"File type {file.content_type} not supported")

        if not settings.is_cos_configured:
            logger.error("Attempted to upload document version without valid IBM COS configuration.")
            raise HTTPException(
                status_code=503,
                detail="IBM Cloud Object Storage is not configured for this environment."
            )

        current_key: Optional[str] = None
        version_key: Optional[str] = None
        cos_committed = False

        storage_choice = (storage_type or "cos").lower()
        if storage_choice != "cos":
            logger.warning(
                "Received storage_type='%s' for document version upload; forcing IBM COS storage.",
                storage_choice
            )

        contents = await file.read()
        if contents is None:
            contents = b""

        original_filename = file.filename or f"document-{uuid.uuid4().hex}"
        content_type = file.content_type or mimetypes.guess_type(original_filename)[0] or "application/octet-stream"
        file_extension = Path(original_filename).suffix
        unique_suffix = uuid.uuid4().hex
        generated_filename = f"{document.participant_id}_{document_id}_{unique_suffix}{file_extension}"

        base_prefix = f"participants/{document.participant_id}"
        current_key = object_key(base_prefix, generated_filename)
        versions_prefix = f"{base_prefix}/versions"
        version_key = object_key(versions_prefix, generated_filename)

        try:
            put_bytes(current_key, contents, content_type)
            put_bytes(version_key, contents, content_type)
        except Exception as storage_error:
            logger.error(f"Error uploading new version for document {document_id} to COS: {storage_error}")
            for key_to_remove in (current_key, version_key):
                if key_to_remove:
                    try:
                        delete_object(key_to_remove)
                    except Exception:
                        pass
            raise HTTPException(status_code=500, detail="Failed to store version in object storage")

        file_size = len(contents)
        file_hash = hashlib.sha256(contents).hexdigest()
        now_utc = datetime.now(timezone.utc)
        previous_file_size = document.file_size or 0

        latest_version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(desc(DocumentVersion.version_number)).first()
        new_version_number = (latest_version.version_number + 1) if latest_version else 1

        user_id = current_user.id if current_user else None
        creator_name = (
            getattr(current_user, "full_name", None)
            or getattr(current_user, "email", None)
            or "System User"
        )

        change_metadata = {
            "change_type": "file_update",
            "change_reason": change_reason,
            "user_agent": request.headers.get("user-agent"),
            "ip_address": request.client.host if request.client else None,
            "affected_fields": ["file_content"],
            "storage_provider": "ibm-cos",
            "storage_key": version_key,
            "original_filename": original_filename,
            "file_size_change": file_size - previous_file_size,
            "storage_type": "cos",
        }
        if user_id is not None:
            change_metadata["user_id"] = user_id

        new_version = DocumentVersion(
            document_id=document_id,
            version_number=new_version_number,
            filename=generated_filename,
            file_path=version_key,
            file_size=file_size,
            mime_type=content_type,
            changes_summary=changes_summary,
            change_metadata=change_metadata,
            file_hash=file_hash,
            created_by=creator_name
        )
        db.add(new_version)
        db.flush()

        if latest_version:
            latest_version.replaced_by_version_id = new_version.id
            latest_version.replaced_at = now_utc

        document.filename = generated_filename
        document.original_filename = original_filename
        document.file_path = None
        document.file_size = file_size
        document.mime_type = content_type
        document.version = new_version_number
        document.storage_provider = "ibm-cos"
        document.storage_key = current_key
        document.updated_at = now_utc
        document.file_url = document.file_url or f"/api/v1/documents/{document.id}/download-cos"

        if not document.file_id:
            document.file_id = str(uuid.uuid4())

        metadata = dict(document.extra_metadata or {})
        metadata.update({
            "storage_key": current_key,
            "version_storage_key": version_key,
            "original_filename": original_filename,
        })
        document.extra_metadata = metadata

        db.commit()
        db.refresh(document)
        db.refresh(new_version)
        cos_committed = True

        # Log access
        log_document_access_safe(db, document_id, "version_upload", request, current_user)
        
        return {
            "message": "New version uploaded successfully",
            "version_id": new_version.id,
            "version_number": new_version.version_number,
            "filename": new_version.filename,
            "file_size": new_version.file_size,
            "changes_summary": new_version.changes_summary,
            "created_at": new_version.created_at.isoformat() if new_version.created_at else None,
            "created_by": new_version.created_by
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading new version for document {document_id}: {str(e)}")
        if current_key and not cos_committed:
            try:
                delete_object(current_key)
            except Exception:
                pass
        if version_key and not cos_committed:
            try:
                delete_object(version_key)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail="Failed to upload new version")


@router.post("/documents/{document_id}/versions/{version_id}/restore")
def restore_document_version(
    document_id: int,
    version_id: int,
    request: Request,
    current_user: Optional[User] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Restore a previous version of a document"""
    try:
        if not settings.is_cos_configured:
            logger.error("Attempted to restore document version without valid IBM COS configuration.")
            raise HTTPException(
                status_code=503,
                detail="IBM Cloud Object Storage is not configured for this environment."
            )

        # Check if document and version exist
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        version_to_restore = db.query(DocumentVersion).filter(
            and_(
                DocumentVersion.id == version_id,
                DocumentVersion.document_id == document_id
            )
        ).first()
        
        if not version_to_restore:
            raise HTTPException(status_code=404, detail="Document version not found")
        
        # Get the highest version number
        latest_version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(desc(DocumentVersion.version_number)).first()
        
        new_version_number = (latest_version.version_number + 1) if latest_version else 1

        # Fetch existing version contents
        contents: Optional[bytes] = None
        content_type = version_to_restore.mime_type or "application/octet-stream"

        if version_to_restore.file_path and os.path.exists(version_to_restore.file_path):
            try:
                with open(version_to_restore.file_path, "rb") as source_file:
                    contents = source_file.read()
            except Exception as file_error:
                logger.error(f"Error reading local version file during restore: {file_error}")
                raise HTTPException(status_code=500, detail="Failed to read version file for restore")
        else:
            try:
                obj = get_object_stream(version_to_restore.file_path)
                body = obj.get("Body")
                if body is None:
                    raise ValueError("Version object stream missing body")
                contents = body.read()
                if hasattr(body, "close"):
                    body.close()
                content_type = obj.get("ContentType") or content_type
            except Exception as storage_error:
                logger.error(f"Error fetching version {version_id} from COS during restore: {storage_error}")
                raise HTTPException(status_code=404, detail="Version file not found in storage")

        if contents is None:
            raise HTTPException(status_code=500, detail="Failed to load version contents for restore")

        file_extension = Path(version_to_restore.filename or "").suffix or Path(version_to_restore.file_path or "").suffix
        unique_suffix = uuid.uuid4().hex
        generated_filename = f"{document.participant_id}_{document.id}_{unique_suffix}{file_extension}"

        base_prefix = f"participants/{document.participant_id}"
        current_key = object_key(base_prefix, generated_filename)
        versions_prefix = f"{base_prefix}/versions"
        version_key = object_key(versions_prefix, generated_filename)

        try:
            put_bytes(current_key, contents, content_type)
            put_bytes(version_key, contents, content_type)
        except Exception as storage_error:
            logger.error(f"Error uploading restored version for document {document_id}: {storage_error}")
            for key_to_remove in (current_key, version_key):
                try:
                    delete_object(key_to_remove)
                except Exception:
                    pass
            raise HTTPException(status_code=500, detail="Failed to store restored document in object storage")

        file_size = len(contents)
        file_hash = hashlib.sha256(contents).hexdigest()
        now_utc = datetime.now(timezone.utc)

        user_id = current_user.id if current_user else None
        creator_name = (
            getattr(current_user, "full_name", None)
            or getattr(current_user, "email", None)
            or "System User"
        )

        change_metadata = {
            "change_type": "rollback",
            "rolled_back_to_version": version_to_restore.version_number,
            "storage_provider": "ibm-cos",
            "storage_key": version_key,
            "file_hash": file_hash,
        }
        if user_id is not None:
            change_metadata["user_id"] = user_id

        new_version = DocumentVersion(
            document_id=document_id,
            version_number=new_version_number,
            filename=generated_filename,
            file_path=version_key,
            file_size=file_size,
            mime_type=content_type,
            changes_summary=f"Restored from version {version_to_restore.version_number}",
            change_metadata=change_metadata,
            file_hash=file_hash,
            created_by=creator_name
        )
        
        db.add(new_version)
        db.flush()
        
        if latest_version:
            latest_version.replaced_by_version_id = new_version.id
            latest_version.replaced_at = now_utc
        
        # Update the main document record
        document.filename = generated_filename
        document.file_path = None
        document.storage_provider = "ibm-cos"
        document.storage_key = current_key
        document.file_size = file_size
        document.mime_type = content_type
        document.version = new_version_number
        document.updated_at = now_utc
        document.file_url = document.file_url or f"/api/v1/documents/{document.id}/download-cos"
        
        metadata = dict(document.extra_metadata or {})
        metadata.update({
            "storage_key": current_key,
            "version_storage_key": version_key,
            "restored_from_version": version_to_restore.version_number,
        })
        document.extra_metadata = metadata
        
        db.commit()
        db.refresh(new_version)

        log_document_access_safe(db, document_id, "version_restore", request, current_user)

        return {
            "message": "Document version restored successfully",
            "new_version_id": new_version.id,
            "new_version_number": new_version_number,
            "restored_from_version": version_to_restore.version_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error restoring document version: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to restore document version")


@router.get("/documents/{document_id}/versions/{version_id}/preview")
def preview_document_version(
    document_id: int,
    version_id: int,
    request: Request,
    current_user: Optional[User] = Depends(get_current_active_user),
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

        log_document_access_safe(db, document_id, "version_preview", request, current_user)

        media_type = version.mime_type or getattr(document, "mime_type", None) or "application/octet-stream"
        if not isinstance(media_type, str):
            media_type = str(media_type)
        display_name = version.filename or getattr(document, "original_filename", None) or getattr(document, "filename", None) or f"document_v{version.version_number}"

        if version.file_path and os.path.exists(version.file_path):
            response = FileResponse(path=str(version.file_path), media_type=media_type)
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

        if version.file_path:
            try:
                obj = get_object_stream(version.file_path)
            except Exception as storage_error:
                logger.error(f"Error fetching version {version_id} from storage: {storage_error}")
                raise HTTPException(status_code=404, detail="Version file not found")

            stream = obj.get("Body")
            if stream is None:
                raise HTTPException(status_code=404, detail="Version file not found")

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

        raise HTTPException(status_code=404, detail="Version file not available")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing document version {version_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to preview document version")




@router.get("/documents/{document_id}/versions/{version_id}/download")
def download_document_version(
    document_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Download a specific version of a document"""
    try:
        version = db.query(DocumentVersion).filter(
            and_(
                DocumentVersion.id == version_id,
                DocumentVersion.document_id == document_id
            )
        ).first()
        
        if not version:
            raise HTTPException(status_code=404, detail="Document version not found")
        
        if version.file_path and os.path.exists(version.file_path):
            return FileResponse(
                path=version.file_path,
                filename=version.filename,
                media_type=version.mime_type
            )

        if version.file_path:
            try:
                obj = get_object_stream(version.file_path)
            except Exception as storage_error:
                logger.error(f"Error fetching version {version_id} from COS during download: {storage_error}")
                raise HTTPException(status_code=404, detail="Version file not found")

            stream = obj.get("Body")
            if stream is None:
                raise HTTPException(status_code=404, detail="Version file not found")

            media_type = obj.get("ContentType") or version.mime_type or "application/octet-stream"
            if not isinstance(media_type, str):
                media_type = str(media_type)
            headers = {
                "Content-Disposition": f'attachment; filename="{version.filename}"'
            }
            return StreamingResponse(stream, media_type=media_type, headers=headers)

        raise HTTPException(status_code=404, detail="Version file not available")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading document version: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to download document version")


@router.get("/documents/{document_id}/approval-history")
def get_document_approval_history(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get approval history for a document"""
    try:
        # Check if document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get all approvals for this document
        approvals = db.query(DocumentApproval).filter(
            DocumentApproval.document_id == document_id
        ).order_by(desc(DocumentApproval.created_at)).all()
        
        return [
            {
                "id": approval.id,
                "approver_name": approval.approver_name,
                "approver_role": approval.approver_role,
                "approval_status": approval.approval_status,
                "comments": approval.comments,
                "approved_at": approval.approved_at.isoformat() if approval.approved_at else None,
                "created_at": approval.created_at.isoformat() if approval.created_at else None
            }
            for approval in approvals
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching approval history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch approval history")


@router.post("/documents/{document_id}/create-version")
def create_document_version(
    document_id: int,
    changes_summary: str,
    db: Session = Depends(get_db)
):
    """Create a new version when a document is updated"""
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get the highest version number
        latest_version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(desc(DocumentVersion.version_number)).first()
        
        new_version_number = (latest_version.version_number + 1) if latest_version else 1
        
        # Create new version record
        new_version = DocumentVersion(
            document_id=document_id,
            version_number=new_version_number,
            filename=document.filename,
            file_path=document.file_path,
            file_size=document.file_size,
            mime_type=document.mime_type,
            changes_summary=changes_summary,
            created_by="System"  # This should come from auth context
        )
        
        db.add(new_version)
        db.flush()
        
        # Mark previous version as replaced
        if latest_version:
            latest_version.replaced_by_version_id = new_version.id
        
        # Update document version number
        document.version = new_version_number
        document.updated_at = datetime.now()
        
        db.commit()
        db.refresh(new_version)
        
        return {
            "message": "New document version created",
            "version_id": new_version.id,
            "version_number": new_version_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating document version: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create document version")


@router.delete("/documents/{document_id}/versions/{version_id}")
def delete_document_version(
    document_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Delete a specific version of a document (admin only)"""
    try:
        version = db.query(DocumentVersion).filter(
            and_(
                DocumentVersion.id == version_id,
                DocumentVersion.document_id == document_id
            )
        ).first()
        
        if not version:
            raise HTTPException(status_code=404, detail="Document version not found")
        
        # Don't allow deletion of current version
        if version.replaced_by_version_id is None:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete current version. Restore a different version first."
            )
        
        # Delete file from disk
        try:
            if os.path.exists(version.file_path):
                os.remove(version.file_path)
        except Exception as e:
            logger.warning(f"Could not delete version file {version.file_path}: {str(e)}")
        
        # Delete version record
        db.delete(version)
        db.commit()
        
        return {"message": "Document version deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document version: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete document version")
