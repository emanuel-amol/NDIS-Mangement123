# backend/app/services/settings_service.py
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.settings import (
    ApplicationSettings, ServiceProviderSettings, EmailTemplate, 
    SMSTemplate, IntegrationSettings, RosteringDefaults, Region
)
import logging

logger = logging.getLogger(__name__)

class SettingsService:
    
    @staticmethod
    def get_application_settings(db: Session) -> Dict[str, Any]:
        """Get application-wide settings"""
        settings = db.query(ApplicationSettings).first()
        
        if not settings:
            # Create default settings
            settings = ApplicationSettings()
            db.add(settings)
            db.commit()
            db.refresh(settings)
        
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
    def update_application_settings(
        db: Session, 
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update application settings"""
        settings = db.query(ApplicationSettings).first()
        
        if not settings:
            settings = ApplicationSettings()
            db.add(settings)
        
        # Update fields
        for field, value in updates.items():
            if hasattr(settings, field):
                setattr(settings, field, value)
        
        db.commit()
        db.refresh(settings)
        logger.info("Updated application settings")
        
        return SettingsService.get_application_settings(db)
    
    @staticmethod
    def get_provider_settings(
        db: Session, 
        service_provider_id: int
    ) -> Dict[str, Any]:
        """Get service provider-specific settings"""
        settings = db.query(ServiceProviderSettings).filter(
            ServiceProviderSettings.service_provider_id == service_provider_id
        ).first()
        
        if not settings:
            # Create default settings
            settings = ServiceProviderSettings(service_provider_id=service_provider_id)
            db.add(settings)
            db.commit()
            db.refresh(settings)
        
        return {
            "primary_contact_name": settings.primary_contact_name,
            "primary_contact_email": settings.primary_contact_email,
            "primary_contact_phone": settings.primary_contact_phone,
            "billing_address": settings.billing_address,
            "timezone": settings.timezone,
            "email_notifications": settings.email_notifications,
            "sms_notifications": settings.sms_notifications,
            "in_app_notifications": settings.in_app_notifications,
            "provider_logo_url": settings.provider_logo_url,
            "brand_color_primary": settings.brand_color_primary,
            "brand_color_secondary": settings.brand_color_secondary,
            "worker_onboarding_percentage": settings.worker_onboarding_percentage,
            "additional_settings": settings.additional_settings or {}
        }
    
    @staticmethod
    def update_provider_settings(
        db: Session,
        service_provider_id: int,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update service provider settings"""
        settings = db.query(ServiceProviderSettings).filter(
            ServiceProviderSettings.service_provider_id == service_provider_id
        ).first()
        
        if not settings:
            settings = ServiceProviderSettings(service_provider_id=service_provider_id)
            db.add(settings)
        
        # Update fields
        for field, value in updates.items():
            if hasattr(settings, field):
                setattr(settings, field, value)
        
        db.commit()
        db.refresh(settings)
        logger.info(f"Updated settings for service provider {service_provider_id}")
        
        return SettingsService.get_provider_settings(db, service_provider_id)


class IntegrationService:
    
    @staticmethod
    def get_integrations(
        db: Session,
        service_provider_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get integration settings"""
        query = db.query(IntegrationSettings)
        
        if service_provider_id:
            query = query.filter(IntegrationSettings.service_provider_id == service_provider_id)
        
        integrations = query.all()
        
        return [
            {
                "id": integration.id,
                "integration_type": integration.integration_type,
                "is_enabled": integration.is_enabled,
                "connection_status": integration.connection_status,
                "last_sync": integration.last_sync.isoformat() if integration.last_sync else None,
                "connection_url": integration.connection_url,
                "additional_config": integration.additional_config or {}
            }
            for integration in integrations
        ]
    
    @staticmethod
    def update_integration(
        db: Session,
        integration_type: str,
        service_provider_id: Optional[int],
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update integration settings"""
        
        integration = db.query(IntegrationSettings).filter(
            IntegrationSettings.integration_type == integration_type,
            IntegrationSettings.service_provider_id == service_provider_id
        ).first()
        
        if not integration:
            integration = IntegrationSettings(
                integration_type=integration_type,
                service_provider_id=service_provider_id
            )
            db.add(integration)
        
        # Update fields (be careful with sensitive data)
        safe_fields = ['is_enabled', 'connection_url', 'additional_config']
        for field, value in updates.items():
            if field in safe_fields and hasattr(integration, field):
                setattr(integration, field, value)
        
        db.commit()
        db.refresh(integration)
        logger.info(f"Updated {integration_type} integration")
        
        return {
            "id": integration.id,
            "integration_type": integration.integration_type,
            "is_enabled": integration.is_enabled,
            "connection_status": integration.connection_status,
            "connection_url": integration.connection_url
        }


class RosteringService:
    
    @staticmethod
    def get_rostering_defaults(
        db: Session,
        service_provider_id: int
    ) -> Dict[str, Any]:
        """Get rostering default settings"""
        defaults = db.query(RosteringDefaults).filter(
            RosteringDefaults.service_provider_id == service_provider_id
        ).first()
        
        if not defaults:
            # Create default settings
            defaults = RosteringDefaults(service_provider_id=service_provider_id)
            db.add(defaults)
            db.commit()
            db.refresh(defaults)
        
        return {
            "scheduled_view": defaults.scheduled_view,
            "worker_tracking": defaults.worker_tracking,
            "participant_signature_required": defaults.participant_signature_required,
            "shift_acceptance_required": defaults.shift_acceptance_required,
            "enforce_distance_restriction": defaults.enforce_distance_restriction,
            "shift_start_interval_minutes": defaults.shift_start_interval_minutes,
            "weekly_shift_update_email": defaults.weekly_shift_update_email,
            "shift_reminder_hours": defaults.shift_reminder_hours,
            "additional_defaults": defaults.additional_defaults or {}
        }
    
    @staticmethod
    def update_rostering_defaults(
        db: Session,
        service_provider_id: int,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update rostering default settings"""
        defaults = db.query(RosteringDefaults).filter(
            RosteringDefaults.service_provider_id == service_provider_id
        ).first()
        
        if not defaults:
            defaults = RosteringDefaults(service_provider_id=service_provider_id)
            db.add(defaults)
        
        # Update fields
        for field, value in updates.items():
            if hasattr(defaults, field):
                setattr(defaults, field, value)
        
        db.commit()
        db.refresh(defaults)
        logger.info(f"Updated rostering defaults for service provider {service_provider_id}")
        
        return RosteringService.get_rostering_defaults(db, service_provider_id)


class RegionService:
    
    @staticmethod
    def get_regions(
        db: Session,
        service_provider_id: int
    ) -> List[Dict[str, Any]]:
        """Get regions for a service provider"""
        regions = db.query(Region).filter(
            Region.service_provider_id == service_provider_id,
            Region.is_active == True
        ).all()
        
        return [
            {
                "id": region.id,
                "region_name": region.region_name,
                "parent_region_id": region.parent_region_id,
                "manager_user_id": region.manager_user_id,
                "state": region.state,
                "postcodes": region.postcodes or [],
                "coordinates": region.coordinates or {},
                "is_active": region.is_active
            }
            for region in regions
        ]
    
    @staticmethod
    def create_region(
        db: Session,
        service_provider_id: int,
        region_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new region"""
        region = Region(
            service_provider_id=service_provider_id,
            **region_data
        )
        
        db.add(region)
        db.commit()
        db.refresh(region)
        logger.info(f"Created region '{region.region_name}' for service provider {service_provider_id}")
        
        return {
            "id": region.id,
            "region_name": region.region_name,
            "parent_region_id": region.parent_region_id,
            "manager_user_id": region.manager_user_id,
            "state": region.state,
            "postcodes": region.postcodes or [],
            "coordinates": region.coordinates or {},
            "is_active": region.is_active
        }
    
    @staticmethod
    def update_region(
        db: Session,
        region_id: int,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update a region"""
        region = db.query(Region).filter(Region.id == region_id).first()
        if not region:
            return None
        
        # Update fields
        for field, value in updates.items():
            if hasattr(region, field):
                setattr(region, field, value)
        
        db.commit()
        db.refresh(region)
        logger.info(f"Updated region '{region.region_name}'")
        
        return {
            "id": region.id,
            "region_name": region.region_name,
            "parent_region_id": region.parent_region_id,
            "manager_user_id": region.manager_user_id,
            "state": region.state,
            "postcodes": region.postcodes or [],
            "coordinates": region.coordinates or {},
            "is_active": region.is_active
        }
    
    @staticmethod
    def delete_region(db: Session, region_id: int) -> bool:
        """Delete a region"""
        region = db.query(Region).filter(Region.id == region_id).first()
        if not region:
            return False
        
        region_name = region.region_name
        db.delete(region)
        db.commit()
        logger.info(f"Deleted region '{region_name}'")
        return True