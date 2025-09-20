# backend/app/models/settings.py - SETTINGS MODELS
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON
from app.core.database import Base
from datetime import datetime

class ApplicationSettings(Base):
    __tablename__ = "application_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic application info
    application_name = Column(String(255), nullable=False, default="NDIS Management System")
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    copyright_text = Column(String(255), nullable=False, default="© 2025 NDIS Management System")
    
    # SEO and metadata
    default_meta_keywords = Column(Text, nullable=True)
    default_meta_description = Column(Text, nullable=True)
    default_social_share_image = Column(String(500), nullable=True)
    
    # Maintenance mode
    maintenance_mode = Column(Boolean, default=False, nullable=False)
    maintenance_message = Column(Text, nullable=True)
    
    # Contact information
    office_address = Column(Text, nullable=True)
    contact_number = Column(String(50), nullable=True)
    email_address = Column(String(255), nullable=True)
    
    # Social media links
    social_links = Column(JSON, nullable=True)  # {"facebook": "url", "twitter": "url", etc.}
    
    # Mobile app settings
    playstore_link = Column(String(500), nullable=True)
    appstore_link = Column(String(500), nullable=True)
    current_app_version = Column(String(20), nullable=True)
    
    # Additional settings as JSON
    additional_settings = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=True)
    
    def __repr__(self):
        return f"<ApplicationSettings(id={self.id}, name='{self.application_name}')>"


class ProviderSettings(Base):
    __tablename__ = "provider_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, nullable=False, unique=True)  # FK to service_providers table
    
    # Provider-specific settings as JSON
    settings_data = Column(JSON, nullable=False, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=True)
    
    def __repr__(self):
        return f"<ProviderSettings(id={self.id}, provider_id={self.provider_id})>"


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True)  # FK to users table
    
    # User-specific preferences as JSON
    preferences_data = Column(JSON, nullable=False, default=dict)
    
    # Common preference fields for easy querying
    theme = Column(String(20), default="light", nullable=False)
    language = Column(String(10), default="en", nullable=False)
    timezone = Column(String(50), default="Australia/Melbourne", nullable=False)
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True, nullable=False)
    sms_notifications = Column(Boolean, default=False, nullable=False)
    push_notifications = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=True)
    
    def __repr__(self):
        return f"<UserPreferences(id={self.id}, user_id={self.user_id})>"