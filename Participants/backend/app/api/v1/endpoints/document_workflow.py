# backend/app/api/v1/endpoints/document_workflow.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.enhanced_document_service import EnhancedDocumentService
from app.models.document_workflow import WorkflowType, WorkflowStatus
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class DocumentApprovalRequest(BaseModel):
    approver_name: str
    approver_role: str
    comments: Optional[str] = None

class DocumentRejectionRequest(BaseModel):
    approver_name: str
    approver_role: str
    comments: str

class WorkflowResponse(BaseModel):
    id: int
    participant_id: int
    document_id: Optional[int]
    workflow_type: str
    status: str
    assigned_to: Optional[str]
    priority: str
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    notes: Optional[str]
    workflow_data: dict
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

@router.get("/workflows/pending-approvals", response_model=List[WorkflowResponse])
def get_pending_approvals(
    participant_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get documents pending approval"""
    try:
        workflows = EnhancedDocumentService.get_pending_approvals(db, participant_id)
        return [
            WorkflowResponse(
                id=w.id,
                participant_id=w.participant_id,
                document_id=w.document_id,
                workflow_type=w.workflow_type.value,
                status=w.status.value,
                assigned_to=w.assigned_to,
                priority=w.priority,
                due_date=w.due_date,
                completed_at=w.completed_at,
                notes=w.notes,
                workflow_data=w.workflow_data or {},
                created_at=w.created_at,
                updated_at=w.updated_at
            )
            for w in workflows
        ]
    except Exception as e:
        logger.error(f"Error fetching pending approvals: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/{document_id}/approve")
def approve_document(
    document_id: int,
    approval_request: DocumentApprovalRequest,
    db: Session = Depends(get_db)
):
    """Approve a document"""
    try:
        approval = EnhancedDocumentService.approve_document(
            db=db,
            document_id=document_id,
            approver_name=approval_request.approver_name,
            approver_role=approval_request.approver_role,
            comments=approval_request.comments
        )
        
        return {
            "message": "Document approved successfully",
            "approval_id": approval.id,
            "approved_at": approval.approved_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error approving document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/documents/{document_id}/reject")
def reject_document(
    document_id: int,
    rejection_request: DocumentRejectionRequest,
    db: Session = Depends(get_db)
):
    """Reject a document"""
    try:
        approval = EnhancedDocumentService.reject_document(
            db=db,
            document_id=document_id,
            approver_name=rejection_request.approver_name,
            approver_role=rejection_request.approver_role,
            comments=rejection_request.comments
        )
        
        return {
            "message": "Document rejected",
            "approval_id": approval.id,
            "rejected_at": approval.approved_at.isoformat()
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error rejecting document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_id}/versions")
def get_document_versions(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get all versions of a document"""
    try:
        versions = EnhancedDocumentService.get_document_versions(db, document_id)
        return [
            {
                "id": v.id,
                "version_number": v.version_number,
                "filename": v.filename,
                "file_size": v.file_size,
                "mime_type": v.mime_type,
                "changes_summary": v.changes_summary,
                "created_at": v.created_at.isoformat(),
                "created_by": v.created_by,
                "is_current": v.replaced_by_version_id is None
            }
            for v in versions
        ]
    except Exception as e:
        logger.error(f"Error fetching document versions for {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents/{document_id}/workflow-history", response_model=List[WorkflowResponse])
def get_document_workflow_history(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get workflow history for a document"""
    try:
        workflows = EnhancedDocumentService.get_document_workflow_history(db, document_id)
        return [
            WorkflowResponse(
                id=w.id,
                participant_id=w.participant_id,
                document_id=w.document_id,
                workflow_type=w.workflow_type.value,
                status=w.status.value,
                assigned_to=w.assigned_to,
                priority=w.priority,
                due_date=w.due_date,
                completed_at=w.completed_at,
                notes=w.notes,
                workflow_data=w.workflow_data or {},
                created_at=w.created_at,
                updated_at=w.updated_at
            )
            for w in workflows
        ]
    except Exception as e:
        logger.error(f"Error fetching workflow history for document {document_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-expiry-workflows")
def create_expiry_workflows(
    days_ahead: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Create expiry workflows for documents expiring soon"""
    try:
        workflows_created = EnhancedDocumentService.create_expiry_workflows(db, days_ahead)
        return {
            "message": f"Created {workflows_created} expiry workflows",
            "workflows_created": workflows_created,
            "days_ahead": days_ahead
        }
    except Exception as e:
        logger.error(f"Error creating expiry workflows: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))