# backend/app/services/enhanced_document_service.py
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func
from app.models.document import Document, DocumentCategory, DocumentAccess, DocumentNotification
from app.models.document_workflow import DocumentWorkflow, DocumentVersion, DocumentApproval, WorkflowType, WorkflowStatus
from app.services.document_service import DocumentService
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import os
import shutil
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class EnhancedDocumentService(DocumentService):
    
    @staticmethod
    def create_document_with_workflow(
        db: Session,
        participant_id: int,
        title: str,
        filename: str,
        original_filename: str,
        file_path: str,
        file_size: int,
        mime_type: str,
        category: str,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        visible_to_support_worker: bool = False,
        expiry_date: Optional[datetime] = None,
        uploaded_by: str = "System User",
        requires_approval: bool = True
    ) -> Tuple[Document, Optional[DocumentWorkflow]]:
        """Create document with automatic workflow creation based on category"""
        
        # Check if category requires approval
        category_obj = db.query(DocumentCategory).filter(
            DocumentCategory.category_id == category
        ).first()
        
        auto_approve = not requires_approval or (category_obj and not category_obj.is_required)
        
        # Create the document
        document = Document(
            participant_id=participant_id,
            title=title,
            filename=filename,
            original_filename=original_filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            category=category,
            description=description,
            tags=tags or [],
            visible_to_support_worker=visible_to_support_worker,
            expiry_date=expiry_date,
            uploaded_by=uploaded_by,
            status="active" if auto_approve else "pending_approval"
        )
        
        db.add(document)
        db.flush()  # Get the document ID
        
        workflow = None
        if not auto_approve:
            # Create approval workflow
            workflow = DocumentWorkflow(
                participant_id=participant_id,
                document_id=document.id,
                workflow_type=WorkflowType.APPROVAL,
                status=WorkflowStatus.PENDING,
                priority="normal",
                due_date=datetime.now() + timedelta(days=3),
                workflow_data={
                    "category": document.category,
                    "requires_manager_approval": category_obj.is_required if category_obj else False,
                    "original_filename": original_filename
                }
            )
            db.add(workflow)
        
        # Create first version record
        version = DocumentVersion(
            document_id=document.id,
            version_number=1,
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            changes_summary="Initial upload",
            created_by=uploaded_by
        )
        db.add(version)
        
        db.commit()
        db.refresh(document)
        
        return document, workflow
    
    @staticmethod
    def approve_document(
        db: Session,
        document_id: int,
        approver_name: str,
        approver_role: str,
        comments: Optional[str] = None
    ) -> DocumentApproval:
        """Approve a document and update its status"""
        
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError("Document not found")
        
        # Create approval record
        approval = DocumentApproval(
            document_id=document_id,
            approver_name=approver_name,
            approver_role=approver_role,
            approval_status="approved",
            comments=comments,
            approved_at=datetime.now()
        )
        db.add(approval)
        
        # Update document status
        document.status = "active"
        document.updated_at = datetime.now()
        
        # Update any pending workflows
        workflows = db.query(DocumentWorkflow).filter(
            and_(
                DocumentWorkflow.document_id == document_id,
                DocumentWorkflow.workflow_type == WorkflowType.APPROVAL,
                DocumentWorkflow.status == WorkflowStatus.PENDING
            )
        ).all()
        
        for workflow in workflows:
            workflow.status = WorkflowStatus.APPROVED
            workflow.completed_at = datetime.now()
            workflow.notes = f"Approved by {approver_name} ({approver_role})"
        
        db.commit()
        db.refresh(approval)
        
        return approval
    
    @staticmethod
    def reject_document(
        db: Session,
        document_id: int,
        approver_name: str,
        approver_role: str,
        comments: str
    ) -> DocumentApproval:
        """Reject a document and update its status"""
        
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError("Document not found")
        
        # Create rejection record
        approval = DocumentApproval(
            document_id=document_id,
            approver_name=approver_name,
            approver_role=approver_role,
            approval_status="rejected",
            comments=comments,
            approved_at=datetime.now()
        )
        db.add(approval)
        
        # Update document status
        document.status = "rejected"
        document.updated_at = datetime.now()
        
        # Update any pending workflows
        workflows = db.query(DocumentWorkflow).filter(
            and_(
                DocumentWorkflow.document_id == document_id,
                DocumentWorkflow.workflow_type == WorkflowType.APPROVAL,
                DocumentWorkflow.status == WorkflowStatus.PENDING
            )
        ).all()
        
        for workflow in workflows:
            workflow.status = WorkflowStatus.REJECTED
            workflow.completed_at = datetime.now()
            workflow.notes = f"Rejected by {approver_name} ({approver_role}): {comments}"
        
        db.commit()
        db.refresh(approval)
        
        return approval
    
    @staticmethod
    def get_document_versions(
        db: Session,
        document_id: int
    ) -> List[DocumentVersion]:
        """Get all versions of a document"""
        
        return db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(desc(DocumentVersion.version_number)).all()
    
    @staticmethod
    def get_pending_approvals(
        db: Session,
        participant_id: Optional[int] = None
    ) -> List[DocumentWorkflow]:
        """Get documents pending approval"""
        
        query = db.query(DocumentWorkflow).filter(
            and_(
                DocumentWorkflow.workflow_type == WorkflowType.APPROVAL,
                DocumentWorkflow.status == WorkflowStatus.PENDING
            )
        )
        
        if participant_id:
            query = query.filter(DocumentWorkflow.participant_id == participant_id)
        
        return query.order_by(DocumentWorkflow.due_date).all()
    
    @staticmethod
    def get_document_workflow_history(
        db: Session,
        document_id: int
    ) -> List[DocumentWorkflow]:
        """Get workflow history for a document"""
        
        return db.query(DocumentWorkflow).filter(
            DocumentWorkflow.document_id == document_id
        ).order_by(desc(DocumentWorkflow.created_at)).all()
    
    @staticmethod
    def create_expiry_workflows(db: Session, days_ahead: int = 30):
        """Create expiry workflows for documents expiring soon"""
        
        cutoff_date = datetime.now() + timedelta(days=days_ahead)
        
        # Find documents expiring soon without existing expiry workflows
        expiring_docs = db.query(Document).filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date <= cutoff_date,
                Document.expiry_date >= datetime.now(),
                Document.status == "active"
            )
        ).all()
        
        workflows_created = 0
        
        for doc in expiring_docs:
            # Check if expiry workflow already exists
            existing_workflow = db.query(DocumentWorkflow).filter(
                and_(
                    DocumentWorkflow.document_id == doc.id,
                    DocumentWorkflow.workflow_type == WorkflowType.EXPIRY,
                    DocumentWorkflow.status.in_([WorkflowStatus.PENDING, WorkflowStatus.IN_PROGRESS])
                )
            ).first()
            
            if not existing_workflow:
                workflow = DocumentWorkflow(
                    participant_id=doc.participant_id,
                    document_id=doc.id,
                    workflow_type=WorkflowType.EXPIRY,
                    status=WorkflowStatus.PENDING,
                    priority="high",
                    due_date=doc.expiry_date,
                    workflow_data={
                        "expiry_date": doc.expiry_date.isoformat(),
                        "category": doc.category,
                        "auto_created": True
                    }
                )
                db.add(workflow)
                workflows_created += 1
        
        db.commit()
        return workflows_created