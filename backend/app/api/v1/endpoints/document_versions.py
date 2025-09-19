# backend/app/api/v1/endpoints/document_versions.py - NEW FILE FOR VERSION SUPPORT
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from app.core.database import get_db
from app.models.document import Document
from app.models.document_workflow import DocumentVersion, DocumentApproval
from typing import List, Optional
from datetime import datetime
import logging
import os
import shutil
from pathlib import Path

router = APIRouter()
logger = logging.getLogger(__name__)

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

@router.post("/documents/{document_id}/versions/{version_id}/restore")
def restore_document_version(
    document_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Restore a previous version of a document"""
    try:
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
        
        # Copy the file if it exists
        new_filename = f"{document.participant_id}_{document.id}_v{new_version_number}_{version_to_restore.filename}"
        new_file_path = str(Path(document.file_path).parent / new_filename)
        
        try:
            if os.path.exists(version_to_restore.file_path):
                shutil.copy2(version_to_restore.file_path, new_file_path)
            else:
                # If original file doesn't exist, we can't restore
                raise HTTPException(status_code=400, detail="Original version file not found")
        except Exception as e:
            logger.error(f"Error copying file for version restore: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to restore file")
        
        # Create new version record
        new_version = DocumentVersion(
            document_id=document_id,
            version_number=new_version_number,
            filename=new_filename,
            file_path=new_file_path,
            file_size=version_to_restore.file_size,
            mime_type=version_to_restore.mime_type,
            changes_summary=f"Restored from version {version_to_restore.version_number}",
            created_by="System"  # This should come from auth context
        )
        
        db.add(new_version)
        
        # Update the main document record
        document.filename = new_filename
        document.file_path = new_file_path
        document.version = new_version_number
        document.updated_at = datetime.now()
        
        # Mark previous current version as replaced
        previous_current = db.query(DocumentVersion).filter(
            and_(
                DocumentVersion.document_id == document_id,
                DocumentVersion.replaced_by_version_id.is_(None),
                DocumentVersion.id != new_version.id
            )
        ).first()
        
        if previous_current:
            previous_current.replaced_by_version_id = new_version.id
        
        db.commit()
        db.refresh(new_version)
        
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

@router.get("/documents/{document_id}/versions/{version_id}/download")
def download_document_version(
    document_id: int,
    version_id: int,
    db: Session = Depends(get_db)
):
    """Download a specific version of a document"""
    try:
        from fastapi.responses import FileResponse
        
        version = db.query(DocumentVersion).filter(
            and_(
                DocumentVersion.id == version_id,
                DocumentVersion.document_id == document_id
            )
        ).first()
        
        if not version:
            raise HTTPException(status_code=404, detail="Document version not found")
        
        if not os.path.exists(version.file_path):
            raise HTTPException(status_code=404, detail="Version file not found on disk")
        
        return FileResponse(
            path=version.file_path,
            filename=version.filename,
            media_type=version.mime_type
        )
        
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