# backend/app/services/settings_service.py - COMPLETE SETTINGS SERVICE
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.settings import ApplicationSettings, ProviderSettings
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class SettingsService:
    """Service class for managing application and provider settings"""
    
    @staticmethod
    def get_application_settings(db: Session) -> Dict[str, Any]:
        """Get application settings"""
        settings = db.query(ApplicationSettings).first()
        
        if not settings:
            # Initialize with defaults if not found
            settings = SettingsService.initialize_default_settings(db)
        
        return {
            "application_name": settings.application_name,
            "logo_url": settings.logo_url,
            "favicon_url": settings.favicon_url,
            "copyright_text": settings.copyright_text,
            "default_meta_keywords": settings.default_meta_keywords,
            "default_meta_description": settings.default_meta_description,
            "default_social_share_image": settings.default_social_share_image,
            "maintenance_mode": settings.maintenance_mode,
            "maintenance_message": settings.maintenance_message,
            "office_address": settings.office_address,
            "contact_number": settings.contact_number,
            "email_address": settings.email_address,
            "social_links": settings.social_links or {},
            "playstore_link": settings.playstore_link,
            "appstore_link": settings.appstore_link,
            "current_app_version": settings.current_app_version,
            "additional_settings": settings.additional_settings or {}
        }
    
    @staticmethod
    def update_application_settings(db: Session, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update application settings"""
        settings = db.query(ApplicationSettings).first()
        
        if not settings:
            settings = SettingsService.initialize_default_settings(db)
        
        # Update fields
        for key, value in updates.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        
        settings.updated_at = datetime.now()
        db.commit()
        db.refresh(settings)
        
        logger.info("Application settings updated")
        return SettingsService.get_application_settings(db)
    
    @staticmethod
    def initialize_default_settings(db: Session) -> ApplicationSettings:
        """Initialize default application settings"""
        # Check if settings already exist
        existing_settings = db.query(ApplicationSettings).first()
        if existing_settings:
            return existing_settings
        
        settings = ApplicationSettings(
            application_name="NDIS Management System",
            copyright_text="© 2025 NDIS Management System",
            default_meta_keywords="NDIS, disability services, management",
            default_meta_description="Comprehensive NDIS management system for service providers",
            maintenance_mode=False,
            maintenance_message="System is under maintenance. Please check back later.",
            office_address="",
            contact_number="",
            email_address="",
            social_links={},
            current_app_version="1.0.0",
            additional_settings={}
        )
        
        db.add(settings)
        db.commit()
        db.refresh(settings)
        
        logger.info("Default application settings initialized")
        return settings
    
    @staticmethod
    def get_provider_settings(db: Session, provider_id: int) -> Dict[str, Any]:
        """Get provider-specific settings"""
        settings = db.query(ProviderSettings).filter(
            ProviderSettings.provider_id == provider_id
        ).first()
        
        if not settings:
            # Initialize default provider settings
            settings = ProviderSettings(
                provider_id=provider_id,
                settings_data={
                    "notification_preferences": {
                        "email_notifications": True,
                        "sms_notifications": False,
                        "push_notifications": True
                    },
                    "workflow_preferences": {
                        "auto_approve_low_risk": False,
                        "require_manager_approval": True,
                        "document_retention_days": 2555  # 7 years
                    },
                    "display_preferences": {
                        "theme": "light",
                        "language": "en",
                        "timezone": "Australia/Melbourne"
                    }
                }
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)
        
        return {
            "provider_id": provider_id,
            "settings": settings.settings_data,
            "updated_at": settings.updated_at.isoformat() if settings.updated_at else None
        }
    
    @staticmethod
    def update_provider_settings(
        db: Session, 
        provider_id: int, 
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update provider-specific settings"""
        settings = db.query(ProviderSettings).filter(
            ProviderSettings.provider_id == provider_id
        ).first()
        
        if not settings:
            settings = ProviderSettings(
                provider_id=provider_id,
                settings_data=updates
            )
            db.add(settings)
        else:
            # Merge updates with existing settings
            current_settings = settings.settings_data or {}
            current_settings.update(updates)
            settings.settings_data = current_settings
            settings.updated_at = datetime.now()
        
        db.commit()
        db.refresh(settings)
        
        logger.info(f"Provider {provider_id} settings updated")
        return SettingsService.get_provider_settings(db, provider_id)
    
    @staticmethod
    def get_setting_value(db: Session, key: str, default: Any = None) -> Any:
        """Get a specific setting value by key"""
        settings = db.query(ApplicationSettings).first()
        
        if not settings:
            return default
        
        return getattr(settings, key, default)
    
    @staticmethod
    def set_setting_value(db: Session, key: str, value: Any) -> bool:
        """Set a specific setting value by key"""
        settings = db.query(ApplicationSettings).first()
        
        if not settings:
            settings = SettingsService.initialize_default_settings(db)
        
        if hasattr(settings, key):
            setattr(settings, key, value)
            settings.updated_at = datetime.now()
            db.commit()
            logger.info(f"Setting '{key}' updated to: {value}")
            return True
        
        return False
    
    @staticmethod
    def is_maintenance_mode(db: Session) -> bool:
        """Check if system is in maintenance mode"""
        return SettingsService.get_setting_value(db, "maintenance_mode", False)
    
    @staticmethod
    def get_maintenance_message(db: Session) -> str:
        """Get maintenance mode message"""
        return SettingsService.get_setting_value(
            db, 
            "maintenance_message", 
            "System is under maintenance. Please check back later."
        )