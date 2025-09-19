# backend/app/models/document.py - FIXED VERSION
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, DECIMAL, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

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
    status = Column(String(50), default="active")  # active, archived, deleted
    
    # Audit fields
    uploaded_by = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships - SIMPLIFIED WITHOUT PROBLEMATIC CASCADE
    participant = relationship("Participant", back_populates="documents")
    
    # Simple self-referential relationship for document versions
    child_documents = relationship("Document", 
                                 remote_side=[parent_document_id],
                                 back_populates="parent_document")
    parent_document = relationship("Document", 
                                 remote_side=[id],
                                 back_populates="child_documents")
    
    # Indexes for performance
    __table_args__ = (
        Index('ix_documents_participant_category', 'participant_id', 'category'),
        Index('ix_documents_status_expiry', 'status', 'expiry_date'),
        Index('ix_documents_created_at', 'created_at'),
    )

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
    
    # Simple relationship without cascade
    document = relationship("Document")
    
    # Index for audit queries
    __table_args__ = (
        Index('ix_document_access_document_user', 'document_id', 'user_id'),
        Index('ix_document_access_accessed_at', 'accessed_at'),
    )

# REMOVED DocumentTemplate CLASS - IT CONFLICTS WITH DOCUMENT GENERATION
# The document generation templates are handled in document_generation.py

class DocumentNotification(Base):
    __tablename__ = "document_notifications"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    notification_type = Column(String(50), nullable=False)  # expiry_warning, expired, new_upload
    recipient_email = Column(String(255))
    recipient_role = Column(String(50))
    
    # Status tracking
    sent_at = Column(DateTime(timezone=True))
    is_sent = Column(Boolean, default=False)
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)
    
    # Scheduling
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Simple relationships without cascade
    document = relationship("Document")
    participant = relationship("Participant")
    
    # Index for processing notifications
    __table_args__ = (
        Index('ix_document_notifications_scheduled', 'scheduled_for', 'is_sent'),
    )

class DocumentCategory(Base):
    __tablename__ = "document_categories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(String(100), nullable=False, unique=True)  # e.g., 'service_agreements'
    name = Column(String(255), nullable=False)  # e.g., 'Service Agreements'
    description = Column(Text)
    is_required = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Configuration for this category
    config = Column(JSON, default=dict)  # Settings like max file size, allowed types, etc.
    
    # System fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())