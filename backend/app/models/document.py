from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.ext.mutable import MutableDict, MutableList

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String(255), unique=True, index=True, nullable=True)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=True)
    referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=True)
    parent_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)

    title = Column(String(255), nullable=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=False)
    file_url = Column(String(500), nullable=True)
    mime_type = Column(String(150), nullable=True)
    file_size = Column(Integer, nullable=True)

    description = Column(Text, nullable=True)
    document_type = Column(String(100), nullable=True)
    category = Column(String(100), nullable=True)
    tags = Column(MutableList.as_mutable(JSON), default=list)

    visible_to_support_worker = Column(Boolean, default=False)
    is_current_version = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    is_confidential = Column(Boolean, default=False)
    requires_approval = Column(Boolean, default=False)
    status = Column(String(50), default="active")
    version = Column(Integer, default=1)

    uploaded_by = Column(String(255), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    expiry_date = Column(DateTime(timezone=True), nullable=True)
    expiry_notification_sent = Column(Boolean, default=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)

    extra_metadata = Column(MutableDict.as_mutable(JSON), default=dict)

    participant = relationship("Participant", back_populates="documents")
    referral = relationship("Referral", back_populates="attached_files")
    parent_document = relationship("Document", remote_side=[id])
    access_logs = relationship("DocumentAccess", back_populates="document", cascade="all, delete-orphan")
    notifications = relationship("DocumentNotification", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        name = self.title or self.original_filename or self.filename
        return f"<Document(id={self.id}, name={name}, status={self.status})>"

    @property
    def file_type(self) -> str | None:
        return self.mime_type

    @file_type.setter
    def file_type(self, value: str | None) -> None:
        self.mime_type = value

    @property
    def original_name(self) -> str | None:
        return self.original_filename

    @original_name.setter
    def original_name(self, value: str | None) -> None:
        self.original_filename = value


class DocumentCategory(Base):
    __tablename__ = "document_categories"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    config = Column(MutableDict.as_mutable(JSON), default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<DocumentCategory(id={self.id}, category_id={self.category_id}, active={self.is_active})>"


class DocumentAccess(Base):
    __tablename__ = "document_access_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_role = Column(String(100), nullable=True)
    access_type = Column(String(50), nullable=False, default="view")
    accessed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    extra_metadata = Column(MutableDict.as_mutable(JSON), default=dict)

    document = relationship("Document", back_populates="access_logs")

    def __repr__(self) -> str:
        return f"<DocumentAccess(id={self.id}, document_id={self.document_id}, access_type={self.access_type})>"


class DocumentNotification(Base):
    __tablename__ = "document_notifications"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=False)
    notification_type = Column(String(100), nullable=False)
    recipient_email = Column(String(255), nullable=True)
    recipient_phone = Column(String(50), nullable=True)
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    is_sent = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    extra_metadata = Column(MutableDict.as_mutable(JSON), default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    document = relationship("Document", back_populates="notifications")
    participant = relationship("Participant")

    def __repr__(self) -> str:
        return f"<DocumentNotification(id={self.id}, document_id={self.document_id}, type={self.notification_type})>"
