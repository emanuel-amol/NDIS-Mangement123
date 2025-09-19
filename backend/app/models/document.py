# backend/app/models/document.py - COMPLETE IMPLEMENTATION WITH WORKFLOW
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, DECIMAL, Index, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class DocumentStatus(str, enum.Enum):
    ACTIVE = "active"
    PENDING_APPROVAL = "pending_approval"
    REJECTED = "rejected"
    ARCHIVED = "archived"
    EXPIRED = "expired"

class WorkflowType(str, enum.Enum):
    APPROVAL = "approval"
    REVIEW = "review"
    EXPIRY = "expiry"
    COMPLIANCE = "compliance"

class WorkflowStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False, index=True)
    
    # Document metadata
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)  # Stored filename
    original_filename = Column(String(255), nullable=False)  # Original uploaded filename
    file_path = Column(String(500), nullable=False)  # Storage path
    file_size = Column(Integer, nullable=False)  # Size in bytes
    mime_type = Column(String(100), nullable=False)
    
    # Document categorization
    category = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    tags = Column(JSON, default=list)  # Array of string tags
    
    # Version control
    version = Column(Integer, default=1, nullable=False)
    is_current_version = Column(Boolean, default=True, nullable=False)
    parent_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    
    # Access control
    visible_to_support_worker = Column(Boolean, default=False, nullable=False)
    
    # Expiry management
    expiry_date = Column(DateTime(timezone=True), nullable=True)
    expiry_notification_sent = Column(Boolean, default=False)
    
    # Status and lifecycle
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.ACTIVE)
    
    # Workflow integration
    requires_approval = Column(Boolean, default=True)
    approved_by = Column(String(255), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_by = Column(String(255), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Audit fields
    uploaded_by = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    participant = relationship("Participant", back_populates="documents")
    workflows = relationship("DocumentWorkflow", back_populates="document")
    versions = relationship("DocumentVersion", back_populates="document")
    approvals = relationship("DocumentApproval", back_populates="document")
    access_logs = relationship("DocumentAccess", back_populates="document")
    notifications = relationship("DocumentNotification", back_populates="document")
    
    # Self-referential relationship for document versions
    child_documents = relationship("Document", 
                                 remote_side=[parent_document_id],
                                 back_populates="parent_document")
    parent_document = relationship("Document", 
                                 remote_side=[id],
                                 back_populates="child_documents")
    
    # Properties for computed fields
    @property
    def is_expired(self) -> bool:
        if not self.expiry_date:
            return False
        from datetime import datetime
        return self.expiry_date < datetime.now()
    
    @property
    def days_until_expiry(self) -> int | None:
        if not self.expiry_date:
            return None
        from datetime import datetime
        delta = self.expiry_date - datetime.now()
        return delta.days
    
    @property
    def download_url(self) -> str:
        return f"/api/v1/participants/{self.participant_id}/documents/{self.id}/download"
    
    # Indexes for performance
    __table_args__ = (
        Index('ix_documents_participant_category', 'participant_id', 'category'),
        Index('ix_documents_status_expiry', 'status', 'expiry_date'),
        Index('ix_documents_created_at', 'created_at'),
        Index('ix_documents_approval', 'requires_approval', 'status'),
    )

class DocumentCategory(Base):
    __tablename__ = "document_categories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(String(100), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_required = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Configuration for this category
    config = Column(JSON, default=dict)  # Settings like max file size, allowed types, etc.
    
    # Default settings
    requires_approval_default = Column(Boolean, default=True)
    visible_to_support_worker_default = Column(Boolean, default=False)
    auto_expiry_days = Column(Integer, nullable=True)
    allowed_mime_types = Column(JSON, default=list)
    max_file_size = Column(Integer, nullable=True)  # in bytes
    
    # System fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DocumentWorkflow(Base):
    __tablename__ = "document_workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    workflow_type = Column(SQLEnum(WorkflowType), nullable=False)
    status = Column(SQLEnum(WorkflowStatus), default=WorkflowStatus.PENDING)
    assigned_to = Column(String(255), nullable=True)  # User email/ID
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    due_date = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    notes = Column(Text)
    workflow_data = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    participant = relationship("Participant")
    document = relationship("Document", back_populates="workflows")

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    changes_summary = Column(Text)
    replaced_by_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(255))
    
    # Relationships
    document = relationship("Document", back_populates="versions")
    replaced_by = relationship("DocumentVersion", remote_side=[id])

class DocumentApproval(Base):
    __tablename__ = "document_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    approver_name = Column(String(255), nullable=False)
    approver_role = Column(String(100), nullable=False)
    approval_status = Column(String(50), nullable=False)  # approved, rejected, pending
    comments = Column(Text)
    approved_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="approvals")

class DocumentAccess(Base):
    __tablename__ = "document_access"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, nullable=False)  # User who accessed
    user_role = Column(String(50), nullable=False)
    access_type = Column(String(50), nullable=False)  # view, download, edit, delete
    accessed_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45))  # IPv4/IPv6
    user_agent = Column(Text)
    
    # Relationships
    document = relationship("Document", back_populates="access_logs")
    
    # Index for audit queries
    __table_args__ = (
        Index('ix_document_access_document_user', 'document_id', 'user_id'),
        Index('ix_document_access_accessed_at', 'accessed_at'),
    )

class DocumentNotification(Base):
    __tablename__ = "document_notifications"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    notification_type = Column(String(50), nullable=False)  # expiry_warning, expired, new_upload
    recipient_email = Column(String(255))
    recipient_role = Column(String(50))
    message = Column(Text)
    
    # Status tracking
    sent_at = Column(DateTime(timezone=True))
    is_sent = Column(Boolean, default=False)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Scheduling
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="notifications")
    participant = relationship("Participant")
    
    # Index for processing notifications
    __table_args__ = (
        Index('ix_document_notifications_scheduled', 'scheduled_for', 'is_sent'),
    )