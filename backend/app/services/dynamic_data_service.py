# app/services/dynamic_data_service.py - Fixed to match existing DynamicData model

from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.dynamic_data import DynamicData
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class DynamicDataService:
    
    @staticmethod
    def create_entry(db: Session, payload: Dict[str, Any], allow_upsert: bool = True) -> DynamicData:
        """
        Create a new dynamic data entry or update existing if allow_upsert=True
        
        Args:
            db: Database session
            payload: Entry data
            allow_upsert: If True, update existing entries instead of raising error
            
        Returns:
            DynamicData: The created or updated entry
            
        Raises:
            ValueError: If entry exists and allow_upsert=False, or if validation fails
        """
        try:
            # Validate required fields
            required_fields = ['type', 'code', 'label']
            for field in required_fields:
                if field not in payload or not payload[field]:
                    raise ValueError(f"Required field '{field}' is missing or empty")
            
            data_type = payload['type']
            code = payload['code']
            
            # Check if entry already exists
            existing_entry = db.query(DynamicData).filter(
                and_(
                    DynamicData.type == data_type,
                    DynamicData.code == code
                )
            ).first()
            
            if existing_entry:
                if not allow_upsert:
                    raise ValueError(f"Entry with type '{data_type}' and code '{code}' already exists")
                
                # Update existing entry
                logger.info(f"Updating existing dynamic data entry: {data_type}/{code}")
                
                # Update only the fields that exist in the model
                existing_entry.label = payload['label']
                existing_entry.is_active = payload.get('is_active', True)
                existing_entry.meta = payload.get('meta', {})
                
                # Only update description if the model has it
                if hasattr(existing_entry, 'description') and 'description' in payload:
                    existing_entry.description = payload['description']
                
                db.commit()
                db.refresh(existing_entry)
                
                # Add action indicator for response
                existing_entry._action = "updated"
                return existing_entry
            
            else:
                # Create new entry
                logger.info(f"Creating new dynamic data entry: {data_type}/{code}")
                
                # Create with only the fields that exist in the model
                entry_data = {
                    'type': data_type,
                    'code': code,
                    'label': payload['label'],
                    'is_active': payload.get('is_active', True),
                    'meta': payload.get('meta', {})
                }
                
                # Only add description if the model supports it
                if 'description' in payload:
                    entry_data['description'] = payload['description']
                
                new_entry = DynamicData(**entry_data)
                
                db.add(new_entry)
                db.commit()
                db.refresh(new_entry)
                
                # Add action indicator for response
                new_entry._action = "created"
                return new_entry
                
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating/updating dynamic data entry: {str(e)}")
            raise ValueError(f"Failed to create/update entry: {str(e)}")
    
    @staticmethod
    def get_by_type_and_code(db: Session, data_type: str, code: str) -> Optional[DynamicData]:
        """Get a specific entry by type and code"""
        return db.query(DynamicData).filter(
            and_(
                DynamicData.type == data_type,
                DynamicData.code == code
            )
        ).first()
    
    @staticmethod
    def get_by_type(db: Session, data_type: str, active_only: bool = True) -> List[DynamicData]:
        """Get all entries of a specific type"""
        query = db.query(DynamicData).filter(DynamicData.type == data_type)
        
        if active_only:
            query = query.filter(DynamicData.is_active == True)
        
        # Order by label since we don't have sort_order
        return query.order_by(DynamicData.label).all()
    
    @staticmethod
    def get_all_types(db: Session) -> List[str]:
        """Get all available dynamic data types"""
        return [row[0] for row in db.query(DynamicData.type).distinct().order_by(DynamicData.type).all()]
    
    @staticmethod
    def get_type_statistics(db: Session, data_type: str) -> Dict[str, int]:
        """Get statistics for a specific type"""
        total_entries = db.query(DynamicData).filter(DynamicData.type == data_type).count()
        active_entries = db.query(DynamicData).filter(
            and_(
                DynamicData.type == data_type,
                DynamicData.is_active == True
            )
        ).count()
        
        return {
            "total_entries": total_entries,
            "active_entries": active_entries,
            "inactive_entries": total_entries - active_entries
        }
    
    @staticmethod
    def update_entry(db: Session, entry_id: int, payload: Dict[str, Any]) -> Optional[DynamicData]:
        """Update an existing entry by ID"""
        try:
            entry = db.query(DynamicData).filter(DynamicData.id == entry_id).first()
            
            if not entry:
                return None
            
            # Update allowed fields that exist in the model
            if 'label' in payload:
                entry.label = payload['label']
            if 'is_active' in payload:
                entry.is_active = payload['is_active']
            if 'meta' in payload:
                entry.meta = payload['meta']
            
            # Only update description if the model has it
            if hasattr(entry, 'description') and 'description' in payload:
                entry.description = payload['description']
            
            db.commit()
            db.refresh(entry)
            
            return entry
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating dynamic data entry {entry_id}: {str(e)}")
            raise ValueError(f"Failed to update entry: {str(e)}")
    
    @staticmethod
    def set_status(db: Session, entry_id: int, is_active: bool) -> Optional[DynamicData]:
        """Set the active status of an entry"""
        try:
            entry = db.query(DynamicData).filter(DynamicData.id == entry_id).first()
            
            if not entry:
                return None
            
            entry.is_active = is_active
            db.commit()
            db.refresh(entry)
            
            return entry
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error setting status for entry {entry_id}: {str(e)}")
            raise ValueError(f"Failed to set entry status: {str(e)}")
    
    @staticmethod
    def delete_entry(db: Session, entry_id: int) -> bool:
        """Delete an entry (soft delete by setting inactive)"""
        try:
            entry = db.query(DynamicData).filter(DynamicData.id == entry_id).first()
            
            if not entry:
                raise ValueError("Entry not found")
            
            # Soft delete by setting inactive
            entry.is_active = False
            db.commit()
            
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting entry {entry_id}: {str(e)}")
            raise ValueError(f"Failed to delete entry: {str(e)}")
    
    @staticmethod
    def bulk_upsert(db: Session, entries: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Bulk upsert multiple entries
        
        Args:
            db: Database session
            entries: List of entry dictionaries
            
        Returns:
            Dict with counts of created/updated entries
        """
        created_count = 0
        updated_count = 0
        error_count = 0
        
        for entry_data in entries:
            try:
                entry = DynamicDataService.create_entry(db, entry_data, allow_upsert=True)
                if hasattr(entry, '_action'):
                    if entry._action == "created":
                        created_count += 1
                    else:
                        updated_count += 1
                else:
                    created_count += 1  # Default assumption for backward compatibility
                    
            except Exception as e:
                error_count += 1
                logger.error(f"Error processing entry {entry_data.get('type', 'unknown')}/{entry_data.get('code', 'unknown')}: {str(e)}")
        
        return {
            "created": created_count,
            "updated": updated_count,
            "errors": error_count,
            "total_processed": len(entries)
        }
    
    @staticmethod
    def validate_entry_data(payload: Dict[str, Any]) -> List[str]:
        """
        Validate entry data and return list of validation errors
        
        Args:
            payload: Entry data to validate
            
        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []
        
        # Required fields
        required_fields = ['type', 'code', 'label']
        for field in required_fields:
            if field not in payload or not payload[field]:
                errors.append(f"Required field '{field}' is missing or empty")
        
        # Field type validations
        if 'type' in payload and not isinstance(payload['type'], str):
            errors.append("Field 'type' must be a string")
        
        if 'code' in payload and not isinstance(payload['code'], str):
            errors.append("Field 'code' must be a string")
        
        if 'label' in payload and not isinstance(payload['label'], str):
            errors.append("Field 'label' must be a string")
        
        if 'is_active' in payload and not isinstance(payload['is_active'], bool):
            errors.append("Field 'is_active' must be a boolean")
        
        if 'meta' in payload and not isinstance(payload['meta'], dict):
            errors.append("Field 'meta' must be a dictionary")
        
        # Code format validation (alphanumeric + underscores, uppercase)
        if 'code' in payload and payload['code']:
            code = payload['code']
            if not code.replace('_', '').replace('-', '').isalnum():
                errors.append("Field 'code' must contain only alphanumeric characters, underscores, and hyphens")
            if code != code.upper():
                errors.append("Field 'code' should be uppercase")
        
        return errors