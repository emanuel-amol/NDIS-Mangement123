# backend/app/models/xero_token.py

from sqlalchemy import Column, Integer, String, DateTime, Text
from app.core.database import Base
from datetime import datetime

class XeroToken(Base):
    """
    Store Xero OAuth tokens securely in the database.
    Tokens are encrypted before storage and decrypted on retrieval.

    Each organization/user can have their own Xero connection.
    """
    __tablename__ = "xero_tokens"

    id = Column(Integer, primary_key=True, index=True)

    # Organization/User identification
    # For multi-tenant support, store which organization this token belongs to
    organization_id = Column(Integer, nullable=True, index=True)  # FK to organizations table if exists
    user_id = Column(Integer, nullable=True, index=True)  # FK to users table - who authorized this

    # Encrypted token fields
    access_token_encrypted = Column(Text, nullable=False)  # Encrypted access token
    refresh_token_encrypted = Column(Text, nullable=False)  # Encrypted refresh token
    id_token_encrypted = Column(Text, nullable=True)  # Encrypted ID token (optional)

    # Token metadata (not encrypted - needed for management)
    token_type = Column(String(50), nullable=False, default="Bearer")
    expires_at = Column(Integer, nullable=False)  # Unix timestamp
    scope = Column(String(500), nullable=True)  # Space-separated scopes

    # Xero tenant information
    tenant_id = Column(String(255), nullable=False, index=True)  # Xero organization ID
    tenant_name = Column(String(255), nullable=True)  # Xero organization name

    # Token status
    is_active = Column(String(20), nullable=False, default="active")  # active, expired, revoked
    last_used_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=True)

    def __repr__(self):
        return f"<XeroToken(id={self.id}, tenant_id='{self.tenant_id}', expires_at={self.expires_at})>"
