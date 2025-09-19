# backend/app/api/v1/endpoints/enhanced_document_versions.py
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.enhanced_version_control_service import EnhancedVersionControlService
from app.models.document import Document
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
from datetime import timedelta

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
        # Verify document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        history = EnhancedVersionControlService.get_version_history_detailed(
            db, document_id, include_metadata
        )
        
        return {
            "document_id": document_id,
            "document_title": document.title,
            "total_versions": len(history),
            "version_history": history
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting detailed version history: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get version history")

@router.get("/documents/{document_id}/versions/{version1_id}/compare/{version2_id}")
def compare_document_versions(
    document_id: int,
    version1_id: int,
    version2_id: int,
    db: Session = Depends(get_db)
) -> VersionComparisonResponse:
    """Compare two versions of a document"""
    try:
        comparison = EnhancedVersionControlService.compare_versions(
            db, document_id, version1_id, version2_id
        )
        
        return VersionComparisonResponse(**comparison)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error comparing versions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to compare versions")

@router.post("/documents/{document_id}/versions/upload")
async def create_version_with_file_upload(
    document_id: int,
    request: Request,
    file: UploadFile = File(...),
    changes_summary: str = Form(...),
    change_reason: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Create a new version by uploading a file"""
    try:
        # Verify document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Save uploaded file temporarily
        import tempfile
        import os
        from pathlib import Path
        
        temp_dir = Path(tempfile.gettempdir())
        temp_file_path = temp_dir / f"version_upload_{document_id}_{file.filename}"
        
        try:
            with open(temp_file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Prepare change details
            change_details = {
                'change_reason': change_reason,
                'user_agent': request.headers.get("user-agent"),
                'ip_address': request.client.host if request.client else None,
                'affected_fields': ['file_content']
            }
            
            # Create version
            version = EnhancedVersionControlService.create_version_with_changes(
                db=db,
                document_id=document_id,
                new_file_path=str(temp_file_path),
                changes_summary=changes_summary,
                created_by="System User",  # TODO: Get from auth
                change_details=change_details
            )
            
            return {
                "message": "Version created successfully",
                "version_id": version.id,
                "version_number": version.version_number,
                "changes_summary": version.changes_summary,
                "file_size": version.file_size,
                "created_at": version.created_at.isoformat()
            }
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_file_path)
            except:
                pass
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating version with file upload: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create version")

@router.post("/documents/{document_id}/versions/metadata")
def create_metadata_version(
    document_id: int,
    request_data: MetadataVersionRequest,
    db: Session = Depends(get_db)
):
    """Create a version for metadata-only changes"""
    try:
        version = EnhancedVersionControlService.create_metadata_version(
            db=db,
            document_id=document_id,
            old_metadata=request_data.old_metadata,
            new_metadata=request_data.new_metadata,
            created_by="System User",  # TODO: Get from auth
            change_reason=request_data.change_reason
        )
        
        return {
            "message": "Metadata version created successfully",
            "version_id": version.id,
            "version_number": version.version_number,
            "changes_summary": version.changes_summary,
            "is_metadata_only": True,
            "created_at": version.created_at.isoformat()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating metadata version: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create metadata version")

@router.post("/documents/{document_id}/versions/{version_id}/rollback")
def rollback_to_version(
    document_id: int,
    version_id: int,
    request_data: RollbackRequest,
    db: Session = Depends(get_db)
):
    """Rollback document to a specific version"""
    try:
        version = EnhancedVersionControlService.rollback_to_version(
            db=db,
            document_id=document_id,
            target_version_id=version_id,
            rollback_reason=request_data.rollback_reason,
            created_by="System User"  # TODO: Get from auth
        )
        
        return {
            "message": "Document rolled back successfully",
            "new_version_id": version.id,
            "new_version_number": version.version_number,
            "rolled_back_to_version": version.change_metadata.get('rolled_back_to_version'),
            "rollback_reason": request_data.rollback_reason,
            "created_at": version.created_at.isoformat()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error rolling back document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to rollback document")

@router.get("/documents/{document_id}/versions/analytics")
def get_version_analytics(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get analytics about document version history"""
    try:
        # Verify document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        analytics = EnhancedVersionControlService.get_version_analytics(db, document_id)
        
        return {
            "document_id": document_id,
            "document_title": document.title,
            "analytics": analytics
        }
        
    except Exception as e:
        logger.error(f"Error getting version analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get version analytics")

@router.post("/documents/{document_id}/versions/cleanup")
def cleanup_old_versions(
    document_id: int,
    cleanup_request: CleanupRequest,
    db: Session = Depends(get_db)
):
    """Clean up old document versions"""
    try:
        # Verify document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        result = EnhancedVersionControlService.cleanup_old_versions(
            db=db,
            document_id=document_id,
            keep_versions=cleanup_request.keep_versions,
            keep_days=cleanup_request.keep_days
        )
        
        return {
            "message": "Version cleanup completed",
            "document_id": document_id,
            "cleanup_results": result
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up versions: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to cleanup versions")

@router.get("/documents/{document_id}/versions/{version_id}/diff/{compare_version_id}")
def get_version_diff(
    document_id: int,
    version_id: int,
    compare_version_id: int,
    diff_type: str = "text",  # text, metadata, binary
    db: Session = Depends(get_db)
):
    """Get detailed diff between two versions"""
    try:
        from app.models.document_workflow import DocumentVersion
        
        # Get both versions
        version1 = db.query(DocumentVersion).filter(
            DocumentVersion.id == version_id,
            DocumentVersion.document_id == document_id
        ).first()
        
        version2 = db.query(DocumentVersion).filter(
            DocumentVersion.id == compare_version_id,
            DocumentVersion.document_id == document_id
        ).first()
        
        if not version1 or not version2:
            raise HTTPException(status_code=404, detail="One or both versions not found")
        
        diff_result = {
            "document_id": document_id,
            "version1_id": version_id,
            "version2_id": compare_version_id,
            "diff_type": diff_type
        }
        
        if diff_type == "metadata":
            # Compare metadata
            metadata1 = version1.change_metadata or {}
            metadata2 = version2.change_metadata or {}
            
            diff_result["metadata_diff"] = {
                "added_keys": [k for k in metadata2 if k not in metadata1],
                "removed_keys": [k for k in metadata1 if k not in metadata2],
                "changed_keys": [k for k in metadata1 if k in metadata2 and metadata1[k] != metadata2[k]]
            }
            
        elif diff_type == "text" and version1.mime_type == "text/plain":
            # For text files, provide line-by-line diff
            try:
                with open(version1.file_path, 'r') as f1, open(version2.file_path, 'r') as f2:
                    lines1 = f1.readlines()
                    lines2 = f2.readlines()
                
                import difflib
                diff = list(difflib.unified_diff(lines1, lines2, lineterm=''))
                diff_result["text_diff"] = diff
                
            except Exception as e:
                diff_result["error"] = f"Could not generate text diff: {str(e)}"
                
        elif diff_type == "binary":
            # For binary files, just compare hashes and sizes
            diff_result["binary_diff"] = {
                "file1_size": version1.file_size,
                "file2_size": version2.file_size,
                "size_change": version2.file_size - version1.file_size,
                "files_identical": (
                    getattr(version1, 'file_hash', None) == getattr(version2, 'file_hash', None)
                    if hasattr(version1, 'file_hash') and hasattr(version2, 'file_hash')
                    else None
                )
            }
        
        return diff_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating version diff: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate version diff")

@router.get("/documents/{document_id}/versions/summary")
def get_version_summary(
    document_id: int,
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get a summary of recent version activity"""
    try:
        from app.models.document_workflow import DocumentVersion
        from datetime import datetime, timedelta
        
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Get recent versions
        recent_versions = db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id,
            DocumentVersion.created_at >= cutoff_date
        ).order_by(DocumentVersion.created_at.desc()).all()
        
        # Analyze version patterns
        change_types = {}
        contributors = set()
        total_size_change = 0
        
        for version in recent_versions:
            contributors.add(version.created_by)
            
            if hasattr(version, 'change_metadata') and version.change_metadata:
                change_type = version.change_metadata.get('change_type', 'unknown')
                change_types[change_type] = change_types.get(change_type, 0) + 1
                
                size_change = version.change_metadata.get('file_size_change', 0)
                if isinstance(size_change, (int, float)):
                    total_size_change += size_change
        
        summary = {
            "document_id": document_id,
            "document_title": document.title,
            "period_days": days,
            "recent_activity": {
                "total_versions": len(recent_versions),
                "unique_contributors": len(contributors),
                "contributors": list(contributors),
                "change_type_distribution": change_types,
                "total_size_change": total_size_change,
                "average_versions_per_day": len(recent_versions) / days if days > 0 else 0
            },
            "recent_versions": [
                {
                    "version_number": v.version_number,
                    "changes_summary": v.changes_summary,
                    "created_by": v.created_by,
                    "created_at": v.created_at.isoformat(),
                    "change_type": v.change_metadata.get('change_type') if hasattr(v, 'change_metadata') and v.change_metadata else None
                }
                for v in recent_versions[:5]  # Last 5 versions
            ]
        }
        
        return summary
        
    except Exception as e:
        logger.error(f"Error getting version summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get version summary")