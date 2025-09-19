# backend/app/models/document_generation.py - FIXED VERSION WITHOUT CONFLICTS

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class DocumentGenerationTemplate(Base):
    """Template for generating documents"""
    __tablename__ = "document_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_type = Column(String(100), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    template_content = Column(Text, nullable=False)
    template_variables = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    category = Column(String(100), default="general")
    config = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String(255))
    
    # Relationships
    generated_documents = relationship("GeneratedDocument", back_populates="template")

class GeneratedDocument(Base):
    """Generated document instance"""
    __tablename__ = "generated_documents"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("document_templates.id"), nullable=False, index=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False, index=True)
    
    document_name = Column(String(255), nullable=False)
    document_type = Column(String(100), nullable=False)
    generated_content = Column(Text, nullable=False)
    variables_used = Column(JSON, default=dict)
    file_path = Column(String(500))
    file_format = Column(String(20), default="html")
    status = Column(String(50), default="draft")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    generated_by = Column(String(255))
    
    # Relationships
    template = relationship("DocumentGenerationTemplate", back_populates="generated_documents")
    participant = relationship("Participant")
    signatures = relationship("DocumentSignature", back_populates="generated_document")

class DocumentGenerationVariable(Base):
    """Variables available for document generation"""
    __tablename__ = "document_variables"

    id = Column(Integer, primary_key=True, index=True)
    variable_name = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text)
    data_type = Column(String(50), nullable=False)
    source_table = Column(String(100))
    source_field = Column(String(100))
    default_value = Column(String(500))
    is_required = Column(Boolean, default=False)
    category = Column(String(100), default="general")
    validation_rules = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DocumentSignature(Base):
    """Digital signatures for generated documents"""
    __tablename__ = "document_signatures"

    id = Column(Integer, primary_key=True, index=True)
    generated_document_id = Column(Integer, ForeignKey("generated_documents.id"), nullable=False)
    
    signer_name = Column(String(255), nullable=False)
    signer_role = Column(String(100), nullable=False)
    signer_email = Column(String(255))
    signature_data = Column(Text)
    signature_type = Column(String(50), default="electronic")
    ip_address = Column(String(45))
    user_agent = Column(Text)
    signed_at = Column(DateTime(timezone=True))
    is_verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    generated_document = relationship("GeneratedDocument", back_populates="signatures")

# Add indexes for performance
from sqlalchemy import Index

# Create indexes after table definitions
Index('ix_document_templates_type_category', DocumentGenerationTemplate.template_type, DocumentGenerationTemplate.category)
Index('ix_generated_documents_participant_template', GeneratedDocument.participant_id, GeneratedDocument.template_id)
Index('ix_document_variables_category_required', DocumentGenerationVariable.category, DocumentGenerationVariable.is_required)