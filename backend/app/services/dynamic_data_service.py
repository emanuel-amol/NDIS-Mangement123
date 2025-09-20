# backend/app/services/dynamic_data_service.py - COMPLETE FIXED VERSION
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.dynamic_data import DynamicData
from app.schemas.dynamic_data import DynamicDataCreate, DynamicDataUpdate
import logging

logger = logging.getLogger(__name__)

class DynamicDataService:
    """Service class for managing dynamic data entries"""
    
    @staticmethod
    def list_by_type(db: Session, dtype: str, active_only: bool = True) -> List[DynamicData]:
        """Get all dynamic data entries for a specific type"""
        query = db.query(DynamicData).filter(DynamicData.type == dtype)
        if active_only:
            query = query.filter(DynamicData.is_active == True)
        return query.order_by(DynamicData.label).all()

    @staticmethod
    def create_entry(db: Session, payload: Dict[str, Any]) -> DynamicData:
        """Create a new dynamic data entry"""
        # Validate required fields
        if 'type' not in payload or 'code' not in payload or 'label' not in payload:
            raise ValueError("Missing required fields: type, code, label")
        
        # Check for existing entry with same type/code
        existing = db.query(DynamicData).filter(
            and_(
                DynamicData.type == payload['type'],
                DynamicData.code == payload['code']
            )
        ).first()
        
        if existing:
            raise ValueError(f"Entry with type '{payload['type']}' and code '{payload['code']}' already exists")
        
        # Create the entry
        db_obj = DynamicData(
            type=payload['type'],
            code=payload['code'],
            label=payload['label'],
            is_active=payload.get('is_active', True),
            meta=payload.get('meta')
        )
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Created dynamic data: {payload['type']}/{payload['code']}")
        return db_obj

    @staticmethod
    def update_entry(db: Session, entry_id: int, payload: Dict[str, Any]) -> Optional[DynamicData]:
        """Update a dynamic data entry"""
        db_obj = db.query(DynamicData).filter(DynamicData.id == entry_id).first()
        if not db_obj:
            return None
        
        # Check for duplicate code if code is being updated
        if 'code' in payload and payload['code'] != db_obj.code:
            existing = db.query(DynamicData).filter(
                and_(
                    DynamicData.type == db_obj.type,
                    DynamicData.code == payload['code'],
                    DynamicData.id != entry_id
                )
            ).first()
            
            if existing:
                raise ValueError(f"Entry with type '{db_obj.type}' and code '{payload['code']}' already exists")
        
        # Update fields
        for field, value in payload.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Updated dynamic data: {db_obj.type}/{db_obj.code}")
        return db_obj

    @staticmethod
    def set_status(db: Session, entry_id: int, is_active: bool) -> Optional[DynamicData]:
        """Set active/inactive status of a dynamic data entry"""
        db_obj = db.query(DynamicData).filter(DynamicData.id == entry_id).first()
        if not db_obj:
            return None
        
        db_obj.is_active = is_active
        db.commit()
        db.refresh(db_obj)
        logger.info(f"Set status of {db_obj.type}/{db_obj.code} to {'active' if is_active else 'inactive'}")
        return db_obj

    @staticmethod
    def delete_entry(db: Session, entry_id: int) -> None:
        """Delete a dynamic data entry (hard delete)"""
        db_obj = db.query(DynamicData).filter(DynamicData.id == entry_id).first()
        if not db_obj:
            raise ValueError(f"Dynamic data entry with id {entry_id} not found")
        
        # Log before deletion
        type_code = f"{db_obj.type}/{db_obj.code}"
        
        db.delete(db_obj)
        db.commit()
        logger.info(f"Deleted dynamic data: {type_code}")

    @staticmethod
    def get_all_types(db: Session) -> List[str]:
        """Get all unique types in the system"""
        result = db.query(DynamicData.type).distinct().all()
        return [row[0] for row in result]

    @staticmethod
    def get_by_type_and_code(db: Session, dtype: str, code: str) -> Optional[DynamicData]:
        """Get a specific entry by type and code"""
        return db.query(DynamicData).filter(
            and_(
                DynamicData.type == dtype,
                DynamicData.code == code
            )
        ).first()

    @staticmethod
    def bulk_create(db: Session, entries: List[Dict[str, Any]]) -> List[DynamicData]:
        """Create multiple dynamic data entries"""
        created_entries = []
        
        for entry_data in entries:
            try:
                db_obj = DynamicDataService.create_entry(db, entry_data)
                created_entries.append(db_obj)
            except ValueError as e:
                logger.warning(f"Skipped creating {entry_data.get('type', 'unknown')}/{entry_data.get('code', 'unknown')}: {str(e)}")
                continue
        
        return created_entries

    @staticmethod
    def get_pricing_items(db: Session, active_only: bool = True) -> List[DynamicData]:
        """Get pricing items specifically (helper method for quotations)"""
        return DynamicDataService.list_by_type(db, "pricing_items", active_only)

    @staticmethod
    def search_by_label(db: Session, dtype: str, search_term: str, active_only: bool = True) -> List[DynamicData]:
        """Search dynamic data by label within a type"""
        query = db.query(DynamicData).filter(
            and_(
                DynamicData.type == dtype,
                DynamicData.label.ilike(f"%{search_term}%")
            )
        )
        
        if active_only:
            query = query.filter(DynamicData.is_active == True)
        
        return query.order_by(DynamicData.label).all()

    @staticmethod
    def get_type_statistics(db: Session, dtype: str) -> Dict[str, Any]:
        """Get statistics for a specific data type"""
        total = db.query(DynamicData).filter(DynamicData.type == dtype).count()
        active = db.query(DynamicData).filter(
            and_(DynamicData.type == dtype, DynamicData.is_active == True)
        ).count()
        
        return {
            "type": dtype,
            "total_entries": total,
            "active_entries": active,
            "inactive_entries": total - active
        }

# Legacy functions for backward compatibility (these call the class methods)
def list_by_type(db: Session, dtype: str, active_only: bool = True) -> List[DynamicData]:
    return DynamicDataService.list_by_type(db, dtype, active_only)

def create(db: Session, payload: DynamicDataCreate) -> DynamicData:
    return DynamicDataService.create_entry(db, payload.dict())

def update(db: Session, id: int, payload: DynamicDataUpdate) -> DynamicData:
    result = DynamicDataService.update_entry(db, id, payload.dict(exclude_unset=True))
    if not result:
        raise ValueError(f"Dynamic data entry with id {id} not found")
    return result

def set_status(db: Session, id: int, is_active: bool) -> DynamicData:
    result = DynamicDataService.set_status(db, id, is_active)
    if not result:
        raise ValueError(f"Dynamic data entry with id {id} not found")
    return result

def delete(db: Session, id: int) -> None:
    DynamicDataService.delete_entry(db, id)

def get_all_types(db: Session) -> List[str]:
    return DynamicDataService.get_all_types(db)

def get_by_type_and_code(db: Session, dtype: str, code: str) -> Optional[DynamicData]:
    return DynamicDataService.get_by_type_and_code(db, dtype, code)

def bulk_create(db: Session, entries: List[DynamicDataCreate]) -> List[DynamicData]:
    entry_dicts = [entry.dict() for entry in entries]
    return DynamicDataService.bulk_create(db, entry_dicts)

def get_pricing_items(db: Session, active_only: bool = True) -> List[DynamicData]:
    return DynamicDataService.get_pricing_items(db, active_only)

def search_by_label(db: Session, dtype: str, search_term: str, active_only: bool = True) -> List[DynamicData]:
    return DynamicDataService.search_by_label(db, dtype, search_term, active_only)