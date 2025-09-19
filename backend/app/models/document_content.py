# backend/app/models/document_content.py - FULL-TEXT SEARCH SUPPORT
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class DocumentContent(Base):
    """Store extracted text content from documents for full-text search"""
    __tablename__ = "document_content"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, unique=True, index=True)
    
    # Extracted content
    text_content = Column(Text, nullable=False)  # Full extracted text
    content_hash = Column(String(64), nullable=False, index=True)  # Hash for change detection
    
    # Metadata
    extraction_method = Column(String(50), nullable=False)  # pdf, docx, text, etc.
    word_count = Column(Integer, default=0)
    character_count = Column(Integer, default=0)
    
    # Processing info
    indexed_at = Column(DateTime(timezone=True), server_default=func.now())
    reindex_required = Column(String(10), default='false')  # 'true' if document changed
    
    # Relationships
    document = relationship("Document", back_populates="content")
    
    # Full-text search index
    __table_args__ = (
        Index('ix_document_content_fulltext', 'text_content', postgresql_using='gin'),
        Index('ix_document_content_document', 'document_id'),
    )

class DocumentTag(Base):
    """Enhanced tagging system with categories and metadata"""
    __tablename__ = "document_tags"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    
    # Tag details
    tag_name = Column(String(100), nullable=False, index=True)
    tag_category = Column(String(50), nullable=True, index=True)  # system, user, auto
    tag_type = Column(String(50), default='user')  # user, system, auto-generated
    
    # Metadata
    created_by = Column(String(255), nullable=True)
    confidence_score = Column(Integer, default=100)  # For auto-generated tags
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document")
    
    # Indexes
    __table_args__ = (
        Index('ix_document_tags_name_category', 'tag_name', 'tag_category'),
        Index('ix_document_tags_document_type', 'document_id', 'tag_type'),
    )

class DocumentFolder(Base):
    """Hierarchical folder structure for documents"""
    __tablename__ = "document_folders"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False, index=True)
    
    # Folder structure
    folder_name = Column(String(255), nullable=False)
    folder_path = Column(String(1000), nullable=False, index=True)  # /folder/subfolder
    parent_folder_id = Column(Integer, ForeignKey("document_folders.id"), nullable=True)
    
    # Metadata
    description = Column(Text, nullable=True)
    folder_type = Column(String(50), default='user')  # system, user, auto
    sort_order = Column(Integer, default=0)
    
    # Settings
    auto_organize_rules = Column(String(500), nullable=True)  # JSON rules for auto-filing
    is_active = Column(String(10), default='true')
    
    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    participant = relationship("Participant")
    parent_folder = relationship("DocumentFolder", remote_side=[id], back_populates="subfolders")
    subfolders = relationship("DocumentFolder", back_populates="parent_folder")
    documents = relationship("Document", back_populates="folder")
    
    # Indexes
    __table_args__ = (
        Index('ix_document_folders_participant_path', 'participant_id', 'folder_path'),
        Index('ix_document_folders_parent', 'parent_folder_id'),
    )

class DocumentAccessLog(Base):
    """Detailed access logging for audit trails"""
    __tablename__ = "document_access_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False, index=True)
    
    # Access details
    user_id = Column(Integer, nullable=False, index=True)
    user_name = Column(String(255), nullable=False)
    user_role = Column(String(100), nullable=False, index=True)
    
    # Action details
    action_type = Column(String(50), nullable=False, index=True)  # view, download, edit, delete, approve
    action_description = Column(String(500), nullable=True)
    
    # Context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    session_id = Column(String(255), nullable=True)
    
    # Result
    action_result = Column(String(50), default='success')  # success, failed, partial
    error_message = Column(Text, nullable=True)
    
    # Timing
    accessed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    duration_ms = Column(Integer, nullable=True)
    
    # Relationships
    document = relationship("Document")
    participant = relationship("Participant")
    
    # Indexes for common queries
    __table_args__ = (
        Index('ix_access_logs_user_date', 'user_id', 'accessed_at'),
        Index('ix_access_logs_document_date', 'document_id', 'accessed_at'),
        Index('ix_access_logs_action_date', 'action_type', 'accessed_at'),
    )

class SearchQuery(Base):
    """Track search queries for analytics and improvements"""
    __tablename__ = "search_queries"

    id = Column(Integer, primary_key=True, index=True)
    
    # Query details
    query_text = Column(String(1000), nullable=False, index=True)
    query_hash = Column(String(64), nullable=False, index=True)
    
    # Context
    user_id = Column(Integer, nullable=True, index=True)
    user_role = Column(String(100), nullable=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=True, index=True)
    
    # Filters applied
    filters_json = Column(Text, nullable=True)  # JSON of applied filters
    
    # Results
    results_count = Column(Integer, nullable=False)
    total_results = Column(Integer, nullable=False)
    search_duration_ms = Column(Integer, nullable=True)
    
    # Interaction
    clicked_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    click_position = Column(Integer, nullable=True)  # Position in results
    
    # Timing
    searched_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    participant = relationship("Participant")
    clicked_document = relationship("Document")
    
    # Indexes
    __table_args__ = (
        Index('ix_search_queries_text_date', 'query_text', 'searched_at'),
        Index('ix_search_queries_user_date', 'user_id', 'searched_at'),
        Index('ix_search_queries_hash', 'query_hash'),
    )