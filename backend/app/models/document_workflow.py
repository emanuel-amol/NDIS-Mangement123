# backend/app/models/document_workflow.py - FIXED VERSION
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
    document = relationship("Document")
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
    document = relationship("Document")