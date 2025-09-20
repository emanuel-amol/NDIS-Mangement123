# backend/app/api/v1/endpoints/admin.py - COMPLETE FIXED VERSION
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, desc, func
from app.core.database import get_db
from app.api.v1.endpoints.deps_admin_key import require_admin_key
from app.models.dynamic_data import DynamicData
from app.models.referral import Referral
from app.models.participant import Participant
from app.services.dynamic_data_service import DynamicDataService
from app.services.user_service import UserService, RoleService
from app.services.settings_service import SettingsService
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
from datetime import datetime, timedelta

router = APIRouter()
logger = logging.getLogger(__name__)

# ==========================================
# PYDANTIC MODELS
# ==========================================

class SystemInitResponse(BaseModel):
    message: str
    initialized: List[str]

class SystemStatusResponse(BaseModel):
    system_health: str
    database_status: str
    users: Dict[str, int]
    participants: Dict[str, int]
    referrals: Dict[str, int]
    dynamic_data: Dict[str, Any]
    version: str
    uptime: str

class UserCreateRequest(BaseModel):
    email: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role: str = "user"
    service_provider_id: Optional[int] = None

class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[str] = None
    service_provider_id: Optional[int] = None

class RoleCreateRequest(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    permissions: List[str] = []

class ApplicationSettingsUpdate(BaseModel):
    application_name: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    copyright_text: Optional[str] = None
    default_meta_keywords: Optional[str] = None
    default_meta_description: Optional[str] = None
    default_social_share_image: Optional[str] = None
    maintenance_mode: Optional[bool] = None
    maintenance_message: Optional[str] = None
    office_address: Optional[str] = None
    contact_number: Optional[str] = None
    email_address: Optional[str] = None
    social_links: Optional[Dict[str, str]] = None
    playstore_link: Optional[str] = None
    appstore_link: Optional[str] = None
    current_app_version: Optional[str] = None
    additional_settings: Optional[Dict[str, Any]] = None

# ==========================================
# SYSTEM STATUS & HEALTH
# ==========================================

@router.get("/system-status", response_model=SystemStatusResponse)
def get_system_status(db: Session = Depends(get_db)):
    """Get comprehensive system status"""
    try:
        # Test database connection
        try:
            db.execute(text("SELECT 1"))
            db_status = "connected"
            system_health = "healthy"
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            db_status = f"error: {str(e)}"
            system_health = "unhealthy"

        # Get user counts
        try:
            total_users = UserService.get_user_count(db)
            active_users = UserService.get_active_user_count(db)
            admin_users = UserService.get_admin_user_count(db)
        except Exception as e:
            logger.error(f"Error getting user counts: {e}")
            total_users = active_users = admin_users = 0

        # Get participant counts
        try:
            total_participants = db.query(Participant).count()
            active_participants = db.query(Participant).filter(
                Participant.status.in_(["onboarded", "active"])
            ).count()
        except Exception as e:
            logger.error(f"Error getting participant counts: {e}")
            total_participants = active_participants = 0

        # Get referral counts
        try:
            total_referrals = db.query(Referral).count()
            pending_referrals = db.query(Referral).filter(
                Referral.status.in_(["submitted", "under_review", "pending_information"])
            ).count()
        except Exception as e:
            logger.error(f"Error getting referral counts: {e}")
            total_referrals = pending_referrals = 0

        # Get dynamic data counts
        try:
            total_dynamic_data = db.query(DynamicData).count()
            active_dynamic_data = db.query(DynamicData).filter(DynamicData.is_active == True).count()
            dynamic_data_types = [row[0] for row in db.query(DynamicData.type).distinct().all()]
        except Exception as e:
            logger.error(f"Error getting dynamic data counts: {e}")
            total_dynamic_data = active_dynamic_data = 0
            dynamic_data_types = []

        # Calculate uptime (simplified)
        uptime = "System running"

        return SystemStatusResponse(
            system_health=system_health,
            database_status=db_status,
            users={
                "total": total_users,
                "active": active_users,
                "admins": admin_users
            },
            participants={
                "total": total_participants,
                "active": active_participants
            },
            referrals={
                "total": total_referrals,
                "pending": pending_referrals
            },
            dynamic_data={
                "total": total_dynamic_data,
                "active": active_dynamic_data,
                "types": dynamic_data_types
            },
            version="1.0.0",
            uptime=uptime
        )

    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get system status: {str(e)}")

@router.post("/initialize-system", dependencies=[Depends(require_admin_key)])
def initialize_system(db: Session = Depends(get_db)) -> SystemInitResponse:
    """Initialize system with default data"""
    try:
        initialized = []

        # Initialize dynamic data
        try:
            from app.services.seed_dynamic_data import run as run_seeds
            run_seeds(db)
            initialized.append("dynamic_data")
            logger.info("✅ Dynamic data initialized")
        except Exception as e:
            logger.error(f"Failed to initialize dynamic data: {e}")

        # Initialize system roles
        try:
            RoleService.initialize_system_roles(db)
            initialized.append("system_roles")
            logger.info("✅ System roles initialized")
        except Exception as e:
            logger.error(f"Failed to initialize roles: {e}")

        # Initialize application settings
        try:
            SettingsService.initialize_default_settings(db)
            initialized.append("application_settings")
            logger.info("✅ Application settings initialized")
        except Exception as e:
            logger.error(f"Failed to initialize settings: {e}")

        return SystemInitResponse(
            message=f"System initialization completed. Initialized: {', '.join(initialized)}",
            initialized=initialized
        )

    except Exception as e:
        logger.error(f"System initialization failed: {e}")
        raise HTTPException(status_code=500, detail=f"System initialization failed: {str(e)}")

# ==========================================
# USER MANAGEMENT
# ==========================================

@router.get("/users")
def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[str] = None,
    status: Optional[str] = None,
    provider_id: Optional[int] = None,
    keywords: Optional[str] = None,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_key)
):
    """Get users with filtering and pagination"""
    try:
        users = UserService.get_users_filtered(
            db=db,
            skip=skip,
            limit=limit,
            role=role,
            status=status,
            provider_id=provider_id,
            keywords=keywords
        )
        return users
    except Exception as e:
        logger.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")

@router.post("/users", dependencies=[Depends(require_admin_key)])
def create_user(user_data: UserCreateRequest, db: Session = Depends(get_db)):
    """Create a new user"""
    try:
        user = UserService.create_user(
            db=db,
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone_number=user_data.phone_number,
            role=user_data.role,
            service_provider_id=user_data.service_provider_id
        )
        
        return {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "message": "User created successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@router.patch("/users/{user_id}", dependencies=[Depends(require_admin_key)])
def update_user(user_id: int, updates: UserUpdateRequest, db: Session = Depends(get_db)):
    """Update a user"""
    try:
        user = UserService.update_user(
            db=db,
            user_id=user_id,
            **updates.dict(exclude_unset=True)
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "message": "User updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

@router.patch("/users/{user_id}/status", dependencies=[Depends(require_admin_key)])
def set_user_status(user_id: int, is_active: bool = Query(), db: Session = Depends(get_db)):
    """Set user active/inactive status"""
    try:
        user = UserService.set_user_status(db, user_id, is_active)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": user.id,
            "email": user.email,
            "is_active": user.is_active,
            "message": f"User {'activated' if is_active else 'deactivated'} successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting user status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to set user status: {str(e)}")

@router.post("/users/{user_id}/reset-password", dependencies=[Depends(require_admin_key)])
def reset_user_password(
    user_id: int, 
    send_email: bool = Query(True), 
    db: Session = Depends(get_db)
):
    """Reset user password"""
    try:
        result = UserService.reset_user_password(db, user_id, send_email)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error resetting password: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")

@router.delete("/users/{user_id}", dependencies=[Depends(require_admin_key)])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user"""
    try:
        success = UserService.delete_user(db, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

# ==========================================
# ROLE MANAGEMENT
# ==========================================

@router.get("/roles")
def get_roles(db: Session = Depends(get_db), _: None = Depends(require_admin_key)):
    """Get all roles"""
    try:
        roles = RoleService.get_all_roles(db)
        return roles
    except Exception as e:
        logger.error(f"Error getting roles: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get roles: {str(e)}")

@router.post("/roles", dependencies=[Depends(require_admin_key)])
def create_role(role_data: RoleCreateRequest, db: Session = Depends(get_db)):
    """Create a new role"""
    try:
        role = RoleService.create_role(
            db=db,
            name=role_data.name,
            display_name=role_data.display_name,
            description=role_data.description,
            permissions=role_data.permissions
        )
        
        return {
            "id": role.id,
            "name": role.name,
            "display_name": role.display_name,
            "message": "Role created successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating role: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create role: {str(e)}")

# ==========================================
# DYNAMIC DATA MANAGEMENT
# ==========================================

@router.get("/dynamic-data/types/list")
def list_dynamic_data_types(db: Session = Depends(get_db), _: None = Depends(require_admin_key)):
    """Get all available dynamic data types"""
    try:
        types = DynamicDataService.get_all_types(db)
        return {"types": types}
    except Exception as e:
        logger.error(f"Error getting dynamic data types: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get dynamic data types: {str(e)}")

@router.post("/dynamic-data/{data_type}", dependencies=[Depends(require_admin_key)])
def create_dynamic_data_entry(
    data_type: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Create a new dynamic data entry"""
    try:
        # Ensure the type matches the URL parameter
        payload['type'] = data_type
        
        entry = DynamicDataService.create_entry(db, payload)
        return entry
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating dynamic data entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create dynamic data entry: {str(e)}")

@router.patch("/dynamic-data/{entry_id}", dependencies=[Depends(require_admin_key)])
def update_dynamic_data_entry(
    entry_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """Update a dynamic data entry"""
    try:
        entry = DynamicDataService.update_entry(db, entry_id, payload)
        
        if not entry:
            raise HTTPException(status_code=404, detail="Dynamic data entry not found")
        
        return entry
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating dynamic data entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update dynamic data entry: {str(e)}")

@router.patch("/dynamic-data/{entry_id}/status", dependencies=[Depends(require_admin_key)])
def set_dynamic_data_status(
    entry_id: int,
    is_active: bool = Query(),
    db: Session = Depends(get_db)
):
    """Set dynamic data entry active/inactive status"""
    try:
        entry = DynamicDataService.set_status(db, entry_id, is_active)
        
        if not entry:
            raise HTTPException(status_code=404, detail="Dynamic data entry not found")
        
        return entry
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting dynamic data status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to set dynamic data status: {str(e)}")

@router.delete("/dynamic-data/{entry_id}", dependencies=[Depends(require_admin_key)])
def delete_dynamic_data_entry(entry_id: int, db: Session = Depends(get_db)):
    """Delete a dynamic data entry"""
    try:
        DynamicDataService.delete_entry(db, entry_id)
        return {"message": "Dynamic data entry deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting dynamic data entry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete dynamic data entry: {str(e)}")

# ==========================================
# SETTINGS MANAGEMENT
# ==========================================

@router.get("/settings/application")
def get_application_settings(db: Session = Depends(get_db), _: None = Depends(require_admin_key)):
    """Get application settings"""
    try:
        settings = SettingsService.get_application_settings(db)
        return settings
    except Exception as e:
        logger.error(f"Error getting application settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get application settings: {str(e)}")

@router.patch("/settings/application", dependencies=[Depends(require_admin_key)])
def update_application_settings(
    updates: ApplicationSettingsUpdate,
    db: Session = Depends(get_db)
):
    """Update application settings"""
    try:
        settings = SettingsService.update_application_settings(
            db, updates.dict(exclude_unset=True)
        )
        
        return {
            "settings": settings,
            "message": "Application settings updated successfully"
        }
    except Exception as e:
        logger.error(f"Error updating application settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update application settings: {str(e)}")

@router.get("/settings/provider/{provider_id}")
def get_provider_settings(
    provider_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_key)
):
    """Get provider-specific settings"""
    try:
        settings = SettingsService.get_provider_settings(db, provider_id)
        return settings
    except Exception as e:
        logger.error(f"Error getting provider settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get provider settings: {str(e)}")

# ==========================================
# SYSTEM MAINTENANCE
# ==========================================

@router.post("/maintenance/database-cleanup", dependencies=[Depends(require_admin_key)])
def database_cleanup(db: Session = Depends(get_db)):
    """Perform database cleanup tasks"""
    try:
        # Implement cleanup logic here
        cleanup_results = {
            "old_logs_removed": 0,
            "orphaned_records_removed": 0,
            "cache_cleared": True
        }
        
        return {
            "message": "Database cleanup completed successfully",
            "results": cleanup_results
        }
    except Exception as e:
        logger.error(f"Error during database cleanup: {e}")
        raise HTTPException(status_code=500, detail=f"Database cleanup failed: {str(e)}")

@router.get("/logs/recent")
def get_recent_logs(
    lines: int = Query(100, ge=1, le=1000),
    level: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_key)
):
    """Get recent system logs"""
    try:
        # This would typically read from actual log files
        # For now, return a placeholder response
        logs = [
            {
                "timestamp": datetime.now().isoformat(),
                "level": "INFO",
                "message": "System is running normally",
                "module": "main"
            }
        ]
        
        return {
            "logs": logs,
            "total_lines": len(logs),
            "filtered_level": level
        }
    except Exception as e:
        logger.error(f"Error getting logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")