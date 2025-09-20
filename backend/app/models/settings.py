# backend/app/models/settings.py
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class ApplicationSettings(Base):
    __tablename__ = "application_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Application identity
    application_name = Column(String(255), default="NDIS Management System")
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    copyright_text = Column(String(255), default="© 2025 NDIS Management System")
    
    # SEO defaults
    default_meta_keywords = Column(String(500), nullable=True)
    default_meta_description = Column(String(500), nullable=True)
    default_social_share_image = Column(String(500), nullable=True)
    
    # System status
    maintenance_mode = Column(Boolean, default=False)
    maintenance_message = Column(Text, nullable=True)
    
    # Contact information
    office_address = Column(Text, nullable=True)
    contact_number = Column(String(20), nullable=True)
    email_address = Column(String(255), nullable=True)
    
    # Social links (stored as JSON)
    social_links = Column(JSON, default=dict)  # {"facebook": "url", "twitter": "url", etc.}
    
    # Mobile app settings
    playstore_link = Column(String(500), nullable=True)
    appstore_link = Column(String(500), nullable=True)
    current_app_version = Column(String(20), nullable=True)
    
    # Additional settings
    additional_settings = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ServiceProviderSettings(Base):
    __tablename__ = "service_provider_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    service_provider_id = Column(Integer, nullable=False)  # FK when service providers table exists
    
    # Profile settings
    primary_contact_name = Column(String(255), nullable=True)
    primary_contact_email = Column(String(255), nullable=True)
    primary_contact_phone = Column(String(20), nullable=True)
    billing_address = Column(Text, nullable=True)
    timezone = Column(String(50), default="Australia/Melbourne")
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True)
    sms_notifications = Column(Boolean, default=True)
    in_app_notifications = Column(Boolean, default=True)
    
    # Branding
    provider_logo_url = Column(String(500), nullable=True)
    brand_color_primary = Column(String(7), nullable=True)  # Hex color
    brand_color_secondary = Column(String(7), nullable=True)
    
    # Worker compliance settings
    worker_onboarding_percentage = Column(Integer, default=100)  # % completion required
    
    # Additional settings
    additional_settings = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EmailTemplate(Base):
    __tablename__ = "email_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    service_provider_id = Column(Integer, nullable=True)  # NULL for system-wide templates
    
    template_key = Column(String(100), nullable=False)  # referral_confirmation, status_update, etc.
    template_name = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    html_content = Column(Text, nullable=False)
    text_content = Column(Text, nullable=True)
    
    # Template variables
    available_variables = Column(JSON, default=list)  # List of available variables
    
    is_active = Column(Boolean, default=True)
    is_system_template = Column(Boolean, default=False)  # Built-in templates
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SMSTemplate(Base):
    __tablename__ = "sms_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    service_provider_id = Column(Integer, nullable=True)  # NULL for system-wide templates
    
    template_key = Column(String(100), nullable=False)
    template_name = Column(String(255), nullable=False)
    message_content = Column(Text, nullable=False)
    
    # Template variables
    available_variables = Column(JSON, default=list)
    
    is_active = Column(Boolean, default=True)
    is_system_template = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class IntegrationSettings(Base):
    __tablename__ = "integration_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    service_provider_id = Column(Integer, nullable=True)  # NULL for system-wide
    
    integration_type = Column(String(50), nullable=False)  # xero, myob, salesforce, power_bi
    is_enabled = Column(Boolean, default=False)
    
    # Connection settings (encrypted in production)
    api_key = Column(String(500), nullable=True)
    api_secret = Column(String(500), nullable=True)
    connection_url = Column(String(500), nullable=True)
    additional_config = Column(JSON, default=dict)
    
    # Status
    connection_status = Column(String(50), default="disconnected")  # connected, disconnected, error
    last_sync = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class RosteringDefaults(Base):
    __tablename__ = "rostering_defaults"
    
    id = Column(Integer, primary_key=True, index=True)
    service_provider_id = Column(Integer, nullable=False)
    
    # Default view settings
    scheduled_view = Column(String(20), default="participant")  # participant, worker
    worker_tracking = Column(Boolean, default=True)
    participant_signature_required = Column(Boolean, default=False)
    shift_acceptance_required = Column(Boolean, default=True)
    enforce_distance_restriction = Column(Boolean, default=False)
    
    # Timing settings
    shift_start_interval_minutes = Column(Integer, default=15)
    
    # Notifications
    weekly_shift_update_email = Column(Boolean, default=True)
    shift_reminder_hours = Column(Integer, default=24)
    
    # Additional defaults
    additional_defaults = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Region(Base):
    __tablename__ = "regions"
    
    id = Column(Integer, primary_key=True, index=True)
    service_provider_id = Column(Integer, nullable=False)
    
    region_name = Column(String(255), nullable=False)
    parent_region_id = Column(Integer, nullable=True)  # For child-parent relationships
    manager_user_id = Column(Integer, nullable=True)  # FK to users table
    
    # Geographic data
    state = Column(String(50), nullable=True)
    postcodes = Column(JSON, default=list)  # List of postcodes covered
    coordinates = Column(JSON, default=dict)  # Geographic boundaries
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())