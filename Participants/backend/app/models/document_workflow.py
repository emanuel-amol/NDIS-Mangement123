# backend/app/models/document_workflow.py - ENHANCED VERSION WITH GRANULAR VERSION CONTROL
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

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
    workflow_data = Column(JSON, default=dict)  # CHANGED: metadata -> workflow_data
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    participant = relationship("Participant")
    document = relationship("Document")

class DocumentVersion(Base):
    """Enhanced document version model with detailed change tracking"""
    __tablename__ = "document_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # Enhanced change tracking
    changes_summary = Column(Text)
    change_metadata = Column(JSON, default=dict)  # Detailed change information
    file_hash = Column(String(64))  # SHA-256 hash for integrity checking
    is_metadata_only = Column(Boolean, default=False)  # Flag for metadata-only changes
    
    # Version relationships
    replaced_by_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    replaced_at = Column(DateTime(timezone=True))
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(255))
    
    # Relationships
    document = relationship("Document")
    replaced_by = relationship("DocumentVersion", remote_side=[id], post_update=True)
    
    # Add indexes for performance
    __table_args__ = (
        {}
    )

class DocumentApproval(Base):
    """Enhanced document approval model"""
    __tablename__ = "document_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)  # Link to specific version
    approver_name = Column(String(255), nullable=False)
    approver_role = Column(String(100), nullable=False)
    approver_id = Column(String(100))  # User ID for tracking
    approval_status = Column(String(50), nullable=False)  # approved, rejected, pending
    comments = Column(Text)
    
    # Enhanced approval metadata
    approval_metadata = Column(JSON, default=dict)  # Additional approval context
    approval_level = Column(Integer, default=1)  # Multi-level approvals
    requires_additional_approval = Column(Boolean, default=False)
    
    # Workflow integration
    workflow_id = Column(Integer, ForeignKey("document_workflows.id"), nullable=True)
    
    approved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document")
    version = relationship("DocumentVersion")
    workflow = relationship("DocumentWorkflow")

class DocumentChangeLog(Base):
    """Granular change log for all document modifications"""
    __tablename__ = "document_change_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    
    # Change details
    change_type = Column(String(50), nullable=False)  # create, update, delete, approve, etc.
    field_changed = Column(String(100))  # Specific field that changed
    old_value = Column(Text)
    new_value = Column(Text)
    
    # Context
    change_reason = Column(Text)
    user_id = Column(String(100), nullable=False)
    user_role = Column(String(50))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Metadata
    change_metadata = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document")
    version = relationship("DocumentVersion")

class DocumentReview(Base):
    """Document review and feedback system"""
    __tablename__ = "document_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    
    # Review details
    reviewer_name = Column(String(255), nullable=False)
    reviewer_role = Column(String(100), nullable=False)
    review_type = Column(String(50), default="general")  # general, compliance, clinical, etc.
    
    # Review content
    review_status = Column(String(50), nullable=False)  # in_progress, completed, requires_changes
    overall_rating = Column(Integer)  # 1-5 scale
    comments = Column(Text)
    recommendations = Column(Text)
    
    # Review criteria scores (JSON)
    review_scores = Column(JSON, default=dict)
    
    # Review metadata
    review_metadata = Column(JSON, default=dict)
    
    # Timestamps
    review_started_at = Column(DateTime(timezone=True))
    review_completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    document = relationship("Document")
    version = relationship("DocumentVersion")

class DocumentCollaboration(Base):
    """Document collaboration and sharing"""
    __tablename__ = "document_collaborations"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    # Collaboration details
    collaborator_id = Column(String(100), nullable=False)
    collaborator_name = Column(String(255), nullable=False)
    collaborator_role = Column(String(100), nullable=False)
    
    # Permissions
    can_view = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)
    can_approve = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    
    # Collaboration metadata
    invited_by = Column(String(255))
    invitation_message = Column(Text)
    collaboration_metadata = Column(JSON, default=dict)
    
    # Status
    status = Column(String(50), default="active")  # active, inactive, revoked
    
    # Timestamps
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True))
    last_accessed_at = Column(DateTime(timezone=True))
    
    # Relationships
    document = relationship("Document")

class DocumentAnnotation(Base):
    """Document annotations and comments"""
    __tablename__ = "document_annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    
    # Annotation details
    annotation_type = Column(String(50), default="comment")  # comment, highlight, note
    content = Column(Text, nullable=False)
    
    # Position (for PDF/image annotations)
    page_number = Column(Integer)
    position_data = Column(JSON)  # x, y coordinates, selection data
    
    # Author
    author_id = Column(String(100), nullable=False)
    author_name = Column(String(255), nullable=False)
    author_role = Column(String(100))
    
    # Status
    status = Column(String(50), default="active")  # active, resolved, archived
    is_public = Column(Boolean, default=True)
    
    # Threading (for replies)
    parent_annotation_id = Column(Integer, ForeignKey("document_annotations.id"), nullable=True)
    thread_depth = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True))
    resolved_by = Column(String(255))
    
    # Relationships
    document = relationship("Document")
    version = relationship("DocumentVersion")
    parent_annotation = relationship("DocumentAnnotation", remote_side=[id])
    child_annotations = relationship("DocumentAnnotation", back_populates="parent_annotation")

# Add indexes for performance
from sqlalchemy import Index

# Version control indexes
Index('ix_document_versions_document_version', DocumentVersion.document_id, DocumentVersion.version_number)
Index('ix_document_versions_replaced_by', DocumentVersion.replaced_by_version_id)

# Change log indexes
Index('ix_change_logs_document_time', DocumentChangeLog.document_id, DocumentChangeLog.created_at)
Index('ix_change_logs_user', DocumentChangeLog.user_id, DocumentChangeLog.created_at)

# Review indexes
Index('ix_document_reviews_status', DocumentReview.review_status, DocumentReview.created_at)

# Collaboration indexes
Index('ix_document_collaborations_user', DocumentCollaboration.collaborator_id, DocumentCollaboration.status)