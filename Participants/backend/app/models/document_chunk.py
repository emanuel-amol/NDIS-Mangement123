# backend/app/models/document_chunk.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Float, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ARRAY
from app.core.database import Base
from datetime import datetime

class DocumentChunk(Base):
    """Stores document chunks for RAG (Retrieval Augmented Generation)"""
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False, index=True)
    
    # Chunk content and metadata
    chunk_index = Column(Integer, nullable=False)  # Order within document
    chunk_text = Column(Text, nullable=False)
    chunk_size = Column(Integer, nullable=False)  # Character count
    
    # Chunk positioning info
    page_number = Column(Integer, nullable=True)  # For PDFs
    start_char = Column(Integer, nullable=True)
    end_char = Column(Integer, nullable=True)
    
    # Embedding vector (stored as ARRAY of floats for PostgreSQL)
    # For other databases, use JSON field
    embedding_vector = Column(JSON, nullable=True)  # Will store list of floats
    embedding_model = Column(String(100), nullable=True)  # e.g., "ibm/slate-125m-english-rtrvr"
    
    # Metadata for better retrieval
    chunk_metadata = Column(JSON, default=dict)  # Document type, section, etc.
    
    # Timestamps
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, onupdate=lambda: datetime.utcnow().isoformat())
    
    # Relationships
    document = relationship("Document")
    participant = relationship("Participant")

# Create indexes for efficient querying
Index('ix_document_chunks_doc_participant', 
      DocumentChunk.document_id, 
      DocumentChunk.participant_id)

Index('ix_document_chunks_participant_created', 
      DocumentChunk.participant_id, 
      DocumentChunk.created_at)


class DocumentProcessingJob(Base):
    """Track document processing jobs for async processing"""
    __tablename__ = "document_processing_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    
    job_type = Column(String(50), nullable=False)  # "chunk", "embed", "extract"
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    
    chunks_created = Column(Integer, default=0)
    chunks_embedded = Column(Integer, default=0)
    
    error_message = Column(Text, nullable=True)
    processing_metadata = Column(JSON, default=dict)
    
    started_at = Column(String, nullable=True)
    completed_at = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    
    # Relationships
    document = relationship("Document")
    participant = relationship("Participant")