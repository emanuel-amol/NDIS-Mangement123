# backend/app/api/v1/endpoints/enhanced_document_versions.py - COMPLETE FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.enhanced_version_control_service import EnhancedVersionControlService
from app.models.document import Document
from app.models.document_workflow import DocumentVersion
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
from datetime import datetime, timedelta
from sqlalchemy import desc, and_

router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class VersionComparisonResponse(BaseModel):
    version1: Dict[str, Any]
    version2: Dict[str, Any]
    differences: Dict[str, Any]
    change_analysis: Optional[Dict[str, Any]] = None

class RollbackRequest(BaseModel):
    rollback_reason: str

class MetadataVersionRequest(BaseModel):
    old_metadata: Dict[str, Any]
    new_metadata: Dict[str, Any]
    change_reason: Optional[str] = None

class CleanupRequest(BaseModel):
    keep_versions: int = 10
    keep_days: int = 90

@router.get("/documents/{document_id}/versions/detailed")
def get_detailed_version_history(
    document_id: int,
    include_metadata: bool = True,
    db: Session = Depends(get_db)
):
    """Get detailed version history with change analysis"""
    try:
        logger.info(f"Getting detailed version history for document {document_id}")
        
        # Verify document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Use the service to get detailed history
        try:
            history = EnhancedVersionControlService.get_version_history_detailed(
                db, document_id, include_metadata
            )
        except Exception as service_error:
            logger.error(f"Service error getting version history: {str(service_error)}")
            # Fallback: create basic history if service fails
            history = create_basic_version_history(db, document_id, document)
        
        return {
            "document_id": document_id,
            "document_title": document.title,
            "total_versions": len(history),
            "version_history": history
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting detailed version history for document {document_id}: {str(e)}")
        # Return minimal response instead of failing
        return {
            "document_id": document_id,
            "document_title": "Unknown Document",
            "total_versions": 0,
            "version_history": [],
            "error": f"Failed to load version history: {str(e)}"
        }

def create_basic_version_history(db: Session, document_id: int, document: Document) -> List[Dict[str, Any]]:
    """Create basic version history as fallback"""
    try:
        # Check if any versions exist
        versions = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(desc(DocumentVersion.version_number)).all()
        
        if not versions:
            # Create initial version from document
            initial_version = DocumentVersion(
                document_id=document_id,
                version_number=1,
                filename=document.filename,
                file_path=document.file_path,
                file_size=document.file_size,
                mime_type=document.mime_type,
                changes_summary="Initial version",
                created_by=document.uploaded_by or "System",
                created_at=document.created_at or datetime.now(),
                change_metadata={
                    "change_type": "initial",
                    "changed_fields": [],
                    "file_size_change": 0
                }
            )
            db.add(initial_version)
            db.commit()
            db.refresh(initial_version)
            versions = [initial_version]
        
        # Format versions for response
        history = []
        for version in versions:
            version_data = {
                "id": version.id,
                "version_number": version.version_number,
                "filename": version.filename,
                "file_size": version.file_size,
                "mime_type": version.mime_type,
                "changes_summary": version.changes_summary or "No changes summary",
                "change_metadata": getattr(version, 'change_metadata', {}) or {
                    "change_type": "file_update" if version.version_number > 1 else "initial",
                    "changed_fields": ["file_content"] if version.version_number > 1 else [],
                    "file_size_change": 0
                },
                "file_hash": getattr(version, 'file_hash', None),
                "is_metadata_only": getattr(version, 'is_metadata_only', False),
                "created_at": version.created_at.isoformat() if version.created_at else datetime.now().isoformat(),
                "created_by": version.created_by or "Unknown",
                "is_current": version.replaced_by_version_id is None,
                "replaced_at": getattr(version, 'replaced_at', None),
                "replaced_by_version_id": version.replaced_by_version_id
            }
            
            if hasattr(version, 'replaced_at') and version.replaced_at:
                version_data["replaced_at"] = version.replaced_at.isoformat()
                
            history.append(version_data)
        
        return history
        
    except Exception as e:
        logger.error(f"Error creating basic version history: {str(e)}")
        return []

@router.get("/documents/{document_id}/versions/analytics")
def get_version_analytics(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get analytics about document version history"""
    try:
        logger.info(f"Getting version analytics for document {document_id}")
        
        # Verify document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        try:
            analytics = EnhancedVersionControlService.get_version_analytics(db, document_id)
        except Exception as service_error:
            logger.error(f"Service error getting analytics: {str(service_error)}")
            # Fallback analytics
            analytics = create_basic_analytics(db, document_id, document)
        
        return {
            "document_id": document_id,
            "document_title": document.title,
            "analytics": analytics
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting version analytics for document {document_id}: {str(e)}")
        # Return basic analytics on error
        return {
            "document_id": document_id,
            "document_title": "Unknown Document",
            "analytics": {
                "total_versions": 0,
                "error": f"Failed to calculate analytics: {str(e)}"
            }
        }

def create_basic_analytics(db: Session, document_id: int, document: Document) -> Dict[str, Any]:
    """Create basic analytics as fallback"""
    try:
        versions = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(DocumentVersion.version_number).all()
        
        if not versions:
            # Analytics for document with no version history
            return {
                "total_versions": 1,
                "first_version_date": document.created_at.isoformat() if document.created_at else datetime.now().isoformat(),
                "latest_version_date": document.updated_at.isoformat() if document.updated_at else document.created_at.isoformat() if document.created_at else datetime.now().isoformat(),
                "unique_contributors": 1,
                "contributors": [document.uploaded_by or "System"],
                "versions_per_day": 0.1,
                "file_size_evolution": {
                    "initial_size": document.file_size,
                    "current_size": document.file_size,
                    "total_size_change": 0,
                    "largest_size": document.file_size,
                    "smallest_size": document.file_size,
                    "average_size_change": 0
                },
                "change_type_distribution": {"initial": 1},
                "rollback_count": 0
            }
        else:
            # Analytics from existing versions
            contributors = set(v.created_by for v in versions if v.created_by)
            file_sizes = [v.file_size for v in versions]
            
            first_date = min(v.created_at for v in versions if v.created_at)
            latest_date = max(v.created_at for v in versions if v.created_at)
            time_span_days = max((latest_date - first_date).days, 1)
            
            return {
                "total_versions": len(versions),
                "first_version_date": first_date.isoformat(),
                "latest_version_date": latest_date.isoformat(),
                "unique_contributors": len(contributors),
                "contributors": list(contributors),
                "versions_per_day": len(versions) / time_span_days,
                "file_size_evolution": {
                    "initial_size": file_sizes[0] if file_sizes else 0,
                    "current_size": file_sizes[-1] if file_sizes else 0,
                    "total_size_change": (file_sizes[-1] - file_sizes[0]) if len(file_sizes) >= 2 else 0,
                    "largest_size": max(file_sizes) if file_sizes else 0,
                    "smallest_size": min(file_sizes) if file_sizes else 0,
                    "average_size_change": sum(file_sizes) / len(file_sizes) if file_sizes else 0
                },
                "change_type_distribution": {"file_update": len(versions)},
                "rollback_count": 0
            }
    except Exception as e:
        logger.error(f"Error creating basic analytics: {str(e)}")
        return {"total_versions": 0, "error": str(e)}

@router.get("/documents/{document_id}/versions/{version1_id}/compare/{version2_id}")
def compare_document_versions(
    document_id: int,
    version1_id: int,
    version2_id: int,
    db: Session = Depends(get_db)
) -> VersionComparisonResponse:
    """Compare two versions of a document"""
    try:
        logger.info(f"Comparing versions {version1_id} and {version2_id} for document {document_id}")
        
        try:
            comparison = EnhancedVersionControlService.compare_versions(
                db, document_id, version1_id, version2_id
            )
        except Exception as service_error:
            logger.error(f"Service error comparing versions: {str(service_error)}")
            # Fallback comparison
            comparison = create_basic_comparison(db, document_id, version1_id, version2_id)
        
        return VersionComparisonResponse(**comparison)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing versions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to compare versions")

def create_basic_comparison(db: Session, document_id: int, version1_id: int, version2_id: int) -> Dict[str, Any]:
    """Create basic comparison as fallback"""
    try:
        version1 = db.query(DocumentVersion).filter(
            DocumentVersion.id == version1_id,
            DocumentVersion.document_id == document_id
        ).first()
        
        version2 = db.query(DocumentVersion).filter(
            DocumentVersion.id == version2_id,
            DocumentVersion.document_id == document_id
        ).first()
        
        if not version1 or not version2:
            raise ValueError("One or both versions not found")
        
        time_diff = abs((version2.created_at - version1.created_at).total_seconds()) if version1.created_at and version2.created_at else 0
        
        return {
            "version1": {
                "id": version1.id,
                "version_number": version1.version_number,
                "created_at": version1.created_at.isoformat() if version1.created_at else "",
                "created_by": version1.created_by or "Unknown",
                "file_size": version1.file_size,
                "changes_summary": version1.changes_summary or ""
            },
            "version2": {
                "id": version2.id,
                "version_number": version2.version_number,
                "created_at": version2.created_at.isoformat() if version2.created_at else "",
                "created_by": version2.created_by or "Unknown",
                "file_size": version2.file_size,
                "changes_summary": version2.changes_summary or ""
            },
            "differences": {
                "file_size_change": version2.file_size - version1.file_size,
                "time_between_versions": time_diff,
                "different_creators": version1.created_by != version2.created_by,
                "file_content_changed": version1.filename != version2.filename or version1.file_size != version2.file_size
            },
            "change_analysis": {
                "change_type_1": "file_update",
                "change_type_2": "file_update", 
                "different_change_types": False,
                "file_size_change_1": 0,
                "file_size_change_2": version2.file_size - version1.file_size,
                "affected_fields_1": ["file_content"],
                "affected_fields_2": ["file_content"]
            }
        }
    except Exception as e:
        logger.error(f"Error in basic comparison: {str(e)}")
        raise e

@router.post("/documents/{document_id}/versions/{version_id}/rollback")
def rollback_to_version(
    document_id: int,
    version_id: int,
    request_data: RollbackRequest,
    db: Session = Depends(get_db)
):
    """Rollback document to a specific version"""
    try:
        logger.info(f"Rolling back document {document_id} to version {version_id}")
        
        try:
            version = EnhancedVersionControlService.rollback_to_version(
                db=db,
                document_id=document_id,
                target_version_id=version_id,
                rollback_reason=request_data.rollback_reason,
                created_by="System User"  # TODO: Get from auth
            )
        except Exception as service_error:
            logger.error(f"Service error during rollback: {str(service_error)}")
            # Fallback rollback
            version = create_basic_rollback(db, document_id, version_id, request_data.rollback_reason)
        
        return {
            "message": "Document rolled back successfully",
            "new_version_id": version.id,
            "new_version_number": version.version_number,
            "rolled_back_to_version": getattr(version, 'change_metadata', {}).get('rolled_back_to_version'),
            "rollback_reason": request_data.rollback_reason,
            "created_at": version.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rolling back document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to rollback document")

def create_basic_rollback(db: Session, document_id: int, version_id: int, rollback_reason: str) -> DocumentVersion:
    """Create basic rollback as fallback"""
    try:
        # Get the document and target version
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError("Document not found")
        
        target_version = db.query(DocumentVersion).filter(
            DocumentVersion.id == version_id,
            DocumentVersion.document_id == document_id
        ).first()
        
        if not target_version:
            raise ValueError("Version not found")
        
        # Create a new version that restores the target version
        max_version = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(desc(DocumentVersion.version_number)).first()
        
        new_version_number = (max_version.version_number + 1) if max_version else 1
        
        new_version = DocumentVersion(
            document_id=document_id,
            version_number=new_version_number,
            filename=target_version.filename,
            file_path=target_version.file_path,
            file_size=target_version.file_size,
            mime_type=target_version.mime_type,
            changes_summary=f"Restored from version {target_version.version_number}: {rollback_reason}",
            created_by="System User",
            created_at=datetime.now(),
            change_metadata={
                "change_type": "rollback",
                "rolled_back_to_version": target_version.version_number,
                "rollback_reason": rollback_reason
            }
        )
        
        db.add(new_version)
        
        # Update the main document
        document.filename = target_version.filename
        document.file_path = target_version.file_path
        document.file_size = target_version.file_size
        document.version = new_version_number
        document.updated_at = datetime.now()
        
        db.commit()
        db.refresh(new_version)
        
        return new_version
        
    except Exception as e:
        logger.error(f"Error in basic rollback: {str(e)}")
        db.rollback()
        raise e

# Additional endpoints for compatibility

@router.get("/documents/{document_id}/versions")
def get_basic_document_versions(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get basic document versions - compatibility endpoint"""
    try:
        return get_detailed_version_history(document_id, True, db)
    except Exception as e:
        logger.error(f"Error in basic versions endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get document versions")

@router.get("/documents/{document_id}/versions/summary")
def get_version_summary(
    document_id: int,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get a summary of recent version activity"""
    try:
        logger.info(f"Getting version summary for document {document_id}")
        
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get recent versions
        recent_versions = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id,
            DocumentVersion.created_at >= cutoff_date
        ).order_by(DocumentVersion.created_at.desc()).all()
        
        # Basic summary
        contributors = set(v.created_by for v in recent_versions if v.created_by)
        
        summary = {
            "document_id": document_id,
            "document_title": document.title,
            "period_days": days,
            "recent_activity": {
                "total_versions": len(recent_versions),
                "unique_contributors": len(contributors),
                "contributors": list(contributors),
                "change_type_distribution": {"file_update": len(recent_versions)},
                "total_size_change": 0,
                "average_versions_per_day": len(recent_versions) / days if days > 0 else 0
            },
            "recent_versions": [
                {
                    "version_number": v.version_number,
                    "changes_summary": v.changes_summary or "No summary",
                    "created_by": v.created_by or "Unknown",
                    "created_at": v.created_at.isoformat() if v.created_at else "",
                    "change_type": "file_update"
                }
                for v in recent_versions[:5]
            ]
        }
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting version summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get version summary")

# Additional simplified endpoints for development/testing
@router.post("/documents/{document_id}/versions/create-initial")
def create_initial_version(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Create initial version for existing document (development helper)"""
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if version already exists
        existing = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).first()
        
        if existing:
            return {"message": "Version already exists", "version_id": existing.id}
        
        # Create initial version
        initial_version = DocumentVersion(
            document_id=document_id,
            version_number=1,
            filename=document.filename,
            file_path=document.file_path,
            file_size=document.file_size,
            mime_type=document.mime_type,
            changes_summary="Initial version",
            created_by=document.uploaded_by or "System",
            created_at=document.created_at or datetime.now(),
            change_metadata={
                "change_type": "initial",
                "changed_fields": [],
                "file_size_change": 0
            }
        )
        
        db.add(initial_version)
        db.commit()
        db.refresh(initial_version)
        
        return {
            "message": "Initial version created",
            "version_id": initial_version.id,
            "version_number": initial_version.version_number
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating initial version: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create initial version")