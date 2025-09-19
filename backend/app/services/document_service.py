# backend/app/services/document_service.py - FIXED DELETE METHOD
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func
from app.models.document import Document, DocumentAccess, DocumentCategory, DocumentNotification
from app.models.participant import Participant
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import os
import uuid
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class DocumentService:
    
    @staticmethod
    def get_document_categories(db: Session, active_only: bool = True) -> List[DocumentCategory]:
        """Get all document categories"""
        query = db.query(DocumentCategory)
        if active_only:
            query = query.filter(DocumentCategory.is_active == True)
        
        return query.order_by(DocumentCategory.sort_order, DocumentCategory.name).all()
    
    @staticmethod
    def create_default_categories(db: Session) -> None:
        """Create default document categories if they don't exist"""
        default_categories = [
            {
                'category_id': 'service_agreements',
                'name': 'Service Agreements',
                'description': 'NDIS service agreements and contracts',
                'is_required': True,
                'sort_order': 1
            },
            {
                'category_id': 'medical_consent',
                'name': 'Medical Consent',
                'description': 'Medical consent forms and healthcare directives',
                'is_required': True,
                'sort_order': 2
            },
            {
                'category_id': 'intake_documents',
                'name': 'Intake Documents',
                'description': 'Initial assessment and intake paperwork',
                'is_required': True,
                'sort_order': 3
            },
            {
                'category_id': 'care_plans',
                'name': 'Care Plans',
                'description': 'Individual care and support plans',
                'is_required': False,
                'sort_order': 4
            },
            {
                'category_id': 'risk_assessments',
                'name': 'Risk Assessments',
                'description': 'Safety and risk evaluation documents',
                'is_required': False,
                'sort_order': 5
            },
            {
                'category_id': 'medical_reports',
                'name': 'Medical Reports',
                'description': 'Medical assessments and specialist reports',
                'is_required': False,
                'sort_order': 6
            },
            {
                'category_id': 'general_documents',
                'name': 'General Documents',
                'description': 'Other participant-related documents',
                'is_required': False,
                'sort_order': 7
            },
            {
                'category_id': 'reporting_documents',
                'name': 'Reporting Documents',
                'description': 'Progress reports and compliance documentation',
                'is_required': False,
                'sort_order': 8
            }
        ]
        
        for cat_data in default_categories:
            existing = db.query(DocumentCategory).filter(
                DocumentCategory.category_id == cat_data['category_id']
            ).first()
            
            if not existing:
                category = DocumentCategory(**cat_data)
                db.add(category)
        
        db.commit()
    
    @staticmethod
    def get_documents_for_participant(
        db: Session,
        participant_id: int,
        search: Optional[str] = None,
        category: Optional[str] = None,
        is_expired: Optional[bool] = None,
        visible_to_support_worker: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[Document], int]:
        """Get documents for a participant with filtering and pagination"""
        
        # Build query
        query = db.query(Document).filter(Document.participant_id == participant_id)
        
        # Apply filters
        if search:
            search_filter = or_(
                Document.title.ilike(f"%{search}%"),
                Document.description.ilike(f"%{search}%"),
                Document.original_filename.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        if category:
            query = query.filter(Document.category == category)
        
        if visible_to_support_worker is not None:
            query = query.filter(Document.visible_to_support_worker == visible_to_support_worker)
        
        if is_expired is not None:
            if is_expired:
                query = query.filter(
                    and_(Document.expiry_date.isnot(None), Document.expiry_date < datetime.now())
                )
            else:
                query = query.filter(
                    or_(Document.expiry_date.is_(None), Document.expiry_date >= datetime.now())
                )
        
        # Apply sorting
        if sort_order.lower() == "desc":
            if sort_by == "created_at":
                query = query.order_by(desc(Document.created_at))
            elif sort_by == "title":
                query = query.order_by(desc(Document.title))
            elif sort_by == "category":
                query = query.order_by(desc(Document.category))
            elif sort_by == "expiry_date":
                query = query.order_by(desc(Document.expiry_date))
        else:
            if sort_by == "created_at":
                query = query.order_by(Document.created_at)
            elif sort_by == "title":
                query = query.order_by(Document.title)
            elif sort_by == "category":
                query = query.order_by(Document.category)
            elif sort_by == "expiry_date":
                query = query.order_by(Document.expiry_date)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        documents = query.offset((page - 1) * page_size).limit(page_size).all()
        
        return documents, total
    
    @staticmethod
    def get_document_stats(db: Session, participant_id: int) -> Dict[str, Any]:
        """Get document statistics for a participant"""
        
        # Get base query
        base_query = db.query(Document).filter(Document.participant_id == participant_id)
        
        # Total documents
        total_documents = base_query.count()
        
        # Documents by category - get from database dynamically
        categories = db.query(DocumentCategory).filter(DocumentCategory.is_active == True).all()
        by_category = {}
        for category in categories:
            count = base_query.filter(Document.category == category.category_id).count()
            if count > 0:
                by_category[category.name] = count
        
        # Expired documents
        expired_documents = base_query.filter(
            and_(Document.expiry_date.isnot(None), Document.expiry_date < datetime.now())
        ).count()
        
        # Expiring soon (within 30 days)
        thirty_days_from_now = datetime.now() + timedelta(days=30)
        expiring_soon = base_query.filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date >= datetime.now(),
                Document.expiry_date <= thirty_days_from_now
            )
        ).count()
        
        # Recent uploads (last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_uploads = base_query.filter(Document.created_at >= seven_days_ago).count()
        
        return {
            "total_documents": total_documents,
            "by_category": by_category,
            "expired_documents": expired_documents,
            "expiring_soon": expiring_soon,
            "recent_uploads": recent_uploads
        }
    
    @staticmethod
    def create_document(
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
        uploaded_by: str = "System User"
    ) -> Document:
        """Create a new document record"""
        
        # Validate category exists
        category_exists = db.query(DocumentCategory).filter(
            DocumentCategory.category_id == category,
            DocumentCategory.is_active == True
        ).first()
        
        if not category_exists:
            raise ValueError(f"Invalid category: {category}")
        
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
            status="active"
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        return document
    
    @staticmethod
    def update_document(
        db: Session,
        document_id: int,
        participant_id: int,
        **update_data
    ) -> Optional[Document]:
        """Update document metadata"""
        
        document = db.query(Document).filter(
            and_(
                Document.id == document_id,
                Document.participant_id == participant_id
            )
        ).first()
        
        if not document:
            return None
        
        # Validate category if being updated
        if 'category' in update_data:
            category_exists = db.query(DocumentCategory).filter(
                DocumentCategory.category_id == update_data['category'],
                DocumentCategory.is_active == True
            ).first()
            
            if not category_exists:
                raise ValueError(f"Invalid category: {update_data['category']}")
        
        # Update fields
        for field, value in update_data.items():
            if hasattr(document, field):
                setattr(document, field, value)
        
        document.updated_at = datetime.now()
        db.commit()
        db.refresh(document)
        
        return document
    
    @staticmethod
    def delete_document(
        db: Session,
        document_id: int,
        participant_id: int
    ) -> bool:
        """Delete a document - FIXED VERSION WITH PROPER CASCADE HANDLING"""
        
        try:
            document = db.query(Document).filter(
                and_(
                    Document.id == document_id,
                    Document.participant_id == participant_id
                )
            ).first()
            
            if not document:
                logger.warning(f"Document {document_id} not found for participant {participant_id}")
                return False
            
            # Store file path before deleting record
            file_path = document.file_path
            
            # Step 1: Delete all related document access records first
            logger.info(f"Deleting document access records for document {document_id}")
            access_count = db.query(DocumentAccess).filter(
                DocumentAccess.document_id == document_id
            ).count()
            
            if access_count > 0:
                logger.info(f"Found {access_count} access records to delete")
                db.query(DocumentAccess).filter(
                    DocumentAccess.document_id == document_id
                ).delete(synchronize_session='fetch')
                logger.info(f"Deleted {access_count} document access records")
            
            # Step 2: Delete all related document notifications
            logger.info(f"Deleting document notifications for document {document_id}")
            notification_count = db.query(DocumentNotification).filter(
                DocumentNotification.document_id == document_id
            ).count()
            
            if notification_count > 0:
                logger.info(f"Found {notification_count} notification records to delete")
                db.query(DocumentNotification).filter(
                    DocumentNotification.document_id == document_id
                ).delete(synchronize_session='fetch')
                logger.info(f"Deleted {notification_count} document notification records")
            
            # Step 3: Delete any child document versions (if they exist)
            child_docs = db.query(Document).filter(
                Document.parent_document_id == document_id
            ).all()
            
            if child_docs:
                logger.info(f"Found {len(child_docs)} child document versions to delete")
                for child_doc in child_docs:
                    # Recursively delete child documents and their dependencies
                    DocumentService.delete_document(db, child_doc.id, child_doc.participant_id)
            
            # Step 4: Now delete the main document record
            logger.info(f"Deleting main document record {document_id}")
            db.delete(document)
            db.commit()
            logger.info(f"Successfully deleted document {document_id} from database")
            
            # Step 5: Delete file from disk (do this last, after successful DB deletion)
            try:
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"Successfully deleted file: {file_path}")
                else:
                    logger.warning(f"File not found on disk: {file_path}")
            except Exception as e:
                logger.warning(f"Could not delete file {file_path}: {str(e)}")
                # Don't fail the operation if file can't be deleted
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting document {document_id}: {str(e)}")
            db.rollback()
            raise e
    
    @staticmethod
    def log_document_access(
        db: Session,
        document_id: int,
        user_id: int,
        user_role: str,
        access_type: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Optional[DocumentAccess]:
        """Log document access for audit trail"""
        
        try:
            access_log = DocumentAccess(
                document_id=document_id,
                user_id=user_id,
                user_role=user_role,
                access_type=access_type,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            db.add(access_log)
            db.commit()
            db.refresh(access_log)
            
            return access_log
        except Exception as e:
            logger.error(f"Error logging document access: {str(e)}")
            db.rollback()
            return None
    
    @staticmethod
    def get_expiring_documents(
        db: Session,
        days_ahead: int = 30,
        participant_id: Optional[int] = None
    ) -> List[Document]:
        """Get documents expiring within specified days"""
        
        cutoff_date = datetime.now() + timedelta(days=days_ahead)
        
        query = db.query(Document).filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date >= datetime.now(),
                Document.expiry_date <= cutoff_date,
                Document.status == "active"
            )
        )
        
        if participant_id:
            query = query.filter(Document.participant_id == participant_id)
        
        return query.order_by(Document.expiry_date).all()
    
    @staticmethod
    def get_expired_documents(
        db: Session,
        participant_id: Optional[int] = None
    ) -> List[Document]:
        """Get expired documents"""
        
        query = db.query(Document).filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date < datetime.now(),
                Document.status == "active"
            )
        )
        
        if participant_id:
            query = query.filter(Document.participant_id == participant_id)
        
        return query.order_by(desc(Document.expiry_date)).all()
    
    @staticmethod
    def get_organization_document_stats(db: Session) -> Dict[str, Any]:
        """Get organization-wide document statistics"""
        
        # Total documents
        total_documents = db.query(Document).filter(Document.status == "active").count()
        
        # Total participants with documents
        participants_with_docs = db.query(Document.participant_id).distinct().count()
        
        # Documents by category
        categories = db.query(DocumentCategory).filter(DocumentCategory.is_active == True).all()
        by_category = {}
        for category in categories:
            count = db.query(Document).filter(
                and_(Document.category == category.category_id, Document.status == "active")
            ).count()
            if count > 0:
                by_category[category.name] = count
        
        # Expired documents across organization
        expired_documents = db.query(Document).filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date < datetime.now(),
                Document.status == "active"
            )
        ).count()
        
        # Expiring soon
        thirty_days_from_now = datetime.now() + timedelta(days=30)
        expiring_soon = db.query(Document).filter(
            and_(
                Document.expiry_date.isnot(None),
                Document.expiry_date >= datetime.now(),
                Document.expiry_date <= thirty_days_from_now,
                Document.status == "active"
            )
        ).count()
        
        # Recent uploads
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_uploads = db.query(Document).filter(
            and_(Document.created_at >= seven_days_ago, Document.status == "active")
        ).count()
        
        return {
            "total_documents": total_documents,
            "participants_with_documents": participants_with_docs,
            "by_category": by_category,
            "expired_documents": expired_documents,
            "expiring_soon": expiring_soon,
            "recent_uploads": recent_uploads
        }