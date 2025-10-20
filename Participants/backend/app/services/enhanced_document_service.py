# backend/app/services/enhanced_document_service.py - COMPLETE IMPLEMENTATION
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from app.models.document import Document, DocumentAccess, DocumentNotification
from app.models.participant import Participant
from app.models.document_workflow import DocumentWorkflow, DocumentApproval, WorkflowType, WorkflowStatus, DocumentVersion
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta, timezone
import os
import uuid
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class EnhancedDocumentService:
    
    @staticmethod
    def create_document_with_workflow(
        db: Session,
        participant_id: int,
        title: str,
        filename: str,
        original_filename: str,
        file_path: Optional[str],
        file_size: int,
        mime_type: str,
        category: str,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None,
        visible_to_support_worker: bool = False,
        expiry_date: Optional[datetime] = None,
        uploaded_by: str = "System User",
        requires_approval: bool = True,
        storage_provider: str = "local",
        storage_key: Optional[str] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
        file_url: Optional[str] = None,
    ) -> Tuple[Document, Optional[DocumentWorkflow]]:
        """Create a document with optional workflow"""
        try:
            # Make expiry_date timezone-aware if provided
            if expiry_date and expiry_date.tzinfo is None:
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)
            
            # Create document
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
                status="pending_approval" if requires_approval else "active",
                version=1,
                is_current_version=True,
                storage_provider=storage_provider,
                storage_key=storage_key,
                extra_metadata=dict(extra_metadata or {}),
            )

            if file_url:
                document.file_url = file_url
            
            db.add(document)
            db.flush()  # Get the document ID
            
            workflow = None
            if requires_approval:
                # Create approval workflow
                workflow = DocumentWorkflow(
                    participant_id=participant_id,
                    document_id=document.id,
                    workflow_type=WorkflowType.APPROVAL,
                    status=WorkflowStatus.PENDING,
                    priority="normal",
                    due_date=datetime.now(timezone.utc) + timedelta(days=7),
                    notes=f"Document '{title}' requires approval",
                    workflow_data={
                        "document_category": category,
                        "upload_date": datetime.now(timezone.utc).isoformat(),
                        "requires_approval": True
                    }
                )
                db.add(workflow)
            else:
                # Auto-approve
                document.status = "active"
            
            db.commit()
            db.refresh(document)
            if workflow:
                db.refresh(workflow)
            
            logger.info(f"Created document {document.id} with workflow: {workflow.id if workflow else 'None'}")
            return document, workflow
            
        except Exception as e:
            logger.error(f"Error creating document with workflow: {str(e)}")
            db.rollback()
            raise e
    
    @staticmethod
    def get_pending_approvals(db: Session, participant_id: Optional[int] = None) -> List[DocumentWorkflow]:
        """Get documents pending approval"""
        query = db.query(DocumentWorkflow).filter(
            and_(
                DocumentWorkflow.workflow_type == WorkflowType.APPROVAL,
                DocumentWorkflow.status == WorkflowStatus.PENDING
            )
        )
        
        if participant_id:
            query = query.filter(DocumentWorkflow.participant_id == participant_id)
        
        return query.order_by(desc(DocumentWorkflow.created_at)).all()
    
    @staticmethod
    def approve_document(
        db: Session,
        document_id: int,
        approver_name: str,
        approver_role: str,
        comments: Optional[str] = None
    ) -> DocumentApproval:
        """Approve a document"""
        try:
            # Check if document exists
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
                approved_at=datetime.now(timezone.utc)
            )
            
            db.add(approval)
            
            # Update document status
            document.status = "active"
            
            # Update any pending workflows
            workflow = db.query(DocumentWorkflow).filter(
                and_(
                    DocumentWorkflow.document_id == document_id,
                    DocumentWorkflow.status == WorkflowStatus.PENDING
                )
            ).first()
            
            if workflow:
                workflow.status = WorkflowStatus.APPROVED
                workflow.completed_at = datetime.now(timezone.utc)
                workflow.notes = f"Approved by {approver_name}"
            
            db.commit()
            db.refresh(approval)
            
            logger.info(f"Document {document_id} approved by {approver_name}")
            return approval
            
        except Exception as e:
            logger.error(f"Error approving document {document_id}: {str(e)}")
            db.rollback()
            raise e
    
    @staticmethod
    def reject_document(
        db: Session,
        document_id: int,
        approver_name: str,
        approver_role: str,
        comments: str
    ) -> DocumentApproval:
        """Reject a document"""
        try:
            # Check if document exists
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError("Document not found")
            
            # Create approval record
            approval = DocumentApproval(
                document_id=document_id,
                approver_name=approver_name,
                approver_role=approver_role,
                approval_status="rejected",
                comments=comments,
                approved_at=datetime.now(timezone.utc)
            )
            
            db.add(approval)
            
            # Update document status
            document.status = "rejected"
            
            # Update any pending workflows
            workflow = db.query(DocumentWorkflow).filter(
                and_(
                    DocumentWorkflow.document_id == document_id,
                    DocumentWorkflow.status == WorkflowStatus.PENDING
                )
            ).first()
            
            if workflow:
                workflow.status = WorkflowStatus.REJECTED
                workflow.completed_at = datetime.now(timezone.utc)
                workflow.notes = f"Rejected by {approver_name}: {comments}"
            
            db.commit()
            db.refresh(approval)
            
            logger.info(f"Document {document_id} rejected by {approver_name}")
            return approval
            
        except Exception as e:
            logger.error(f"Error rejecting document {document_id}: {str(e)}")
            db.rollback()
            raise e
    
    @staticmethod
    def get_document_versions(db: Session, document_id: int) -> List[DocumentVersion]:
        """Get all versions of a document"""
        return db.query(DocumentVersion).filter(
            DocumentVersion.document_id == document_id
        ).order_by(desc(DocumentVersion.version_number)).all()
    
    @staticmethod
    def get_document_workflow_history(db: Session, document_id: int) -> List[DocumentWorkflow]:
        """Get workflow history for a document"""
        return db.query(DocumentWorkflow).filter(
            DocumentWorkflow.document_id == document_id
        ).order_by(desc(DocumentWorkflow.created_at)).all()
    
    @staticmethod
    def create_expiry_workflows(db: Session, days_ahead: int = 30) -> int:
        """Create expiry workflows for documents expiring soon"""
        try:
            now_utc = datetime.now(timezone.utc)
            cutoff_date = now_utc + timedelta(days=days_ahead)
            
            # Find documents expiring soon without existing expiry workflows
            expiring_docs = db.query(Document).filter(
                and_(
                    Document.expiry_date.isnot(None),
                    Document.expiry_date <= cutoff_date,
                    Document.expiry_date >= now_utc,
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
                    # Create expiry workflow
                    workflow = DocumentWorkflow(
                        participant_id=doc.participant_id,
                        document_id=doc.id,
                        workflow_type=WorkflowType.EXPIRY,
                        status=WorkflowStatus.PENDING,
                        priority="high" if (doc.expiry_date - now_utc).days <= 7 else "normal",
                        due_date=doc.expiry_date,
                        notes=f"Document '{doc.title}' expires on {doc.expiry_date.strftime('%Y-%m-%d')}",
                        workflow_data={
                            "expiry_date": doc.expiry_date.isoformat(),
                            "days_until_expiry": (doc.expiry_date - now_utc).days,
                            "document_category": doc.category
                        }
                    )
                    
                    db.add(workflow)
                    workflows_created += 1
            
            db.commit()
            
            logger.info(f"Created {workflows_created} expiry workflows")
            return workflows_created
            
        except Exception as e:
            logger.error(f"Error creating expiry workflows: {str(e)}")
            db.rollback()
            raise e
    
    @staticmethod
    def update_document_with_version_tracking(
        db: Session,
        document_id: int,
        update_data: Dict[str, Any],
        created_by: str = "System User"
    ) -> Document:
        """Update a document and create version tracking"""
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError("Document not found")
            
            # Track what changed
            changed_fields = []
            old_metadata = {}
            new_metadata = {}
            
            for field, new_value in update_data.items():
                if hasattr(document, field):
                    old_value = getattr(document, field)
                    if old_value != new_value:
                        changed_fields.append(field)
                        old_metadata[field] = old_value
                        new_metadata[field] = new_value
                        setattr(document, field, new_value)
            
            if changed_fields:
                # Create metadata version if there were changes
                from app.services.enhanced_version_control_service import EnhancedVersionControlService
                EnhancedVersionControlService.create_metadata_version(
                    db=db,
                    document_id=document_id,
                    old_metadata=old_metadata,
                    new_metadata=new_metadata,
                    created_by=created_by,
                    change_reason=f"Document metadata updated: {', '.join(changed_fields)}"
                )
            
            document.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(document)
            
            return document
            
        except Exception as e:
            logger.error(f"Error updating document with version tracking: {str(e)}")
            db.rollback()
            raise e
    
    @staticmethod
    def get_document_analytics(db: Session, participant_id: Optional[int] = None) -> Dict[str, Any]:
        """Get document analytics"""
        try:
            base_query = db.query(Document)
            if participant_id:
                base_query = base_query.filter(Document.participant_id == participant_id)
            
            now_utc = datetime.now(timezone.utc)
            
            # Basic counts
            total_documents = base_query.filter(Document.status == "active").count()
            pending_approval = base_query.filter(Document.status == "pending_approval").count()
            rejected_documents = base_query.filter(Document.status == "rejected").count()
            
            # Expiry analytics
            expired_docs = base_query.filter(
                and_(
                    Document.expiry_date.isnot(None),
                    Document.expiry_date < now_utc,
                    Document.status == "active"
                )
            ).count()
            
            expiring_soon = base_query.filter(
                and_(
                    Document.expiry_date.isnot(None),
                    Document.expiry_date >= now_utc,
                    Document.expiry_date <= now_utc + timedelta(days=30),
                    Document.status == "active"
                )
            ).count()
            
            # Category breakdown
            category_stats = db.query(
                Document.category,
                func.count(Document.id).label('count')
            ).filter(Document.status == "active")
            
            if participant_id:
                category_stats = category_stats.filter(Document.participant_id == participant_id)
            
            category_stats = category_stats.group_by(Document.category).all()
            
            # Recent activity
            recent_uploads = base_query.filter(
                and_(
                    Document.created_at >= now_utc - timedelta(days=7),
                    Document.status.in_(["active", "pending_approval"])
                )
            ).count()
            
            return {
                "total_documents": total_documents,
                "pending_approval": pending_approval,
                "rejected_documents": rejected_documents,
                "expired_documents": expired_docs,
                "expiring_soon": expiring_soon,
                "recent_uploads": recent_uploads,
                "category_breakdown": {cat: count for cat, count in category_stats},
                "approval_rate": (total_documents / (total_documents + rejected_documents)) * 100 if (total_documents + rejected_documents) > 0 else 100
            }
            
        except Exception as e:
            logger.error(f"Error getting document analytics: {str(e)}")
            raise e
    
    @staticmethod
    def bulk_update_documents(
        db: Session,
        document_ids: List[int],
        update_data: Dict[str, Any],
        created_by: str = "System User"
    ) -> Dict[str, Any]:
        """Bulk update multiple documents"""
        try:
            updated_count = 0
            failed_count = 0
            errors = []
            
            for doc_id in document_ids:
                try:
                    EnhancedDocumentService.update_document_with_version_tracking(
                        db=db,
                        document_id=doc_id,
                        update_data=update_data,
                        created_by=created_by
                    )
                    updated_count += 1
                except Exception as e:
                    failed_count += 1
                    errors.append(f"Document {doc_id}: {str(e)}")
            
            return {
                "updated_count": updated_count,
                "failed_count": failed_count,
                "errors": errors,
                "total_processed": len(document_ids)
            }
            
        except Exception as e:
            logger.error(f"Error in bulk update: {str(e)}")
            raise e
    
    @staticmethod
    def create_document_notification(
        db: Session,
        document_id: int,
        participant_id: int,
        notification_type: str,
        recipient_email: Optional[str] = None,
        scheduled_for: Optional[datetime] = None
    ) -> DocumentNotification:
        """Create a document notification"""
        try:
            if scheduled_for is None:
                scheduled_for = datetime.now(timezone.utc)
            
            notification = DocumentNotification(
                document_id=document_id,
                participant_id=participant_id,
                notification_type=notification_type,
                recipient_email=recipient_email,
                scheduled_for=scheduled_for,
                is_sent=False
            )
            
            db.add(notification)
            db.commit()
            db.refresh(notification)
            
            return notification
            
        except Exception as e:
            logger.error(f"Error creating document notification: {str(e)}")
            db.rollback()
            raise e
    
    @staticmethod
    def get_document_access_history(
        db: Session,
        document_id: int,
        limit: int = 50
    ) -> List[DocumentAccess]:
        """Get access history for a document"""
        return db.query(DocumentAccess).filter(
            DocumentAccess.document_id == document_id
        ).order_by(desc(DocumentAccess.accessed_at)).limit(limit).all()
    
    @staticmethod
    def cleanup_orphaned_files(db: Session, dry_run: bool = True) -> Dict[str, Any]:
        """Clean up orphaned document files"""
        try:
            # Get all document file paths from database
            db_files = set()
            documents = db.query(Document).all()
            for doc in documents:
                if doc.file_path and os.path.exists(doc.file_path):
                    db_files.add(os.path.abspath(doc.file_path))
            
            # Get all version file paths
            versions = db.query(DocumentVersion).all()
            for version in versions:
                if version.file_path and os.path.exists(version.file_path):
                    db_files.add(os.path.abspath(version.file_path))
            
            # Scan upload directories for files
            upload_dir = Path("uploads/documents")
            if not upload_dir.exists():
                return {"message": "Upload directory does not exist"}
            
            orphaned_files = []
            total_size = 0
            
            for file_path in upload_dir.rglob("*"):
                if file_path.is_file():
                    abs_path = str(file_path.absolute())
                    if abs_path not in db_files:
                        file_size = file_path.stat().st_size
                        orphaned_files.append({
                            "path": abs_path,
                            "size": file_size,
                            "modified": datetime.fromtimestamp(file_path.stat().st_mtime)
                        })
                        total_size += file_size
            
            if not dry_run:
                # Actually delete the files
                deleted_count = 0
                for file_info in orphaned_files:
                    try:
                        os.remove(file_info["path"])
                        deleted_count += 1
                    except Exception as e:
                        logger.warning(f"Could not delete {file_info['path']}: {str(e)}")
                
                return {
                    "orphaned_files_found": len(orphaned_files),
                    "files_deleted": deleted_count,
                    "total_size_freed": total_size,
                    "dry_run": False
                }
            else:
                return {
                    "orphaned_files_found": len(orphaned_files),
                    "total_size": total_size,
                    "files": orphaned_files[:10],  # Show first 10 for preview
                    "dry_run": True
                }
                
        except Exception as e:
            logger.error(f"Error cleaning up orphaned files: {str(e)}")
            raise e
