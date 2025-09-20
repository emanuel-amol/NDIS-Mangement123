# backend/app/services/dynamic_data_service.py
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.dynamic_data import DynamicData
from app.schemas.dynamic_data import DynamicDataCreate, DynamicDataUpdate
import logging

logger = logging.getLogger(__name__)

def list_by_type(db: Session, dtype: str, active_only: bool = True) -> List[DynamicData]:
    """Get all dynamic data entries for a specific type"""
    query = db.query(DynamicData).filter(DynamicData.type == dtype)
    if active_only:
        query = query.filter(DynamicData.is_active == True)
    return query.order_by(DynamicData.label).all()

def create(db: Session, payload: DynamicDataCreate) -> DynamicData:
    """Create a new dynamic data entry"""
    # Check for existing entry with same type/code
    existing = db.query(DynamicData).filter(
        and_(
            DynamicData.type == payload.type,
            DynamicData.code == payload.code
        )
    ).first()
    
    if existing:
        raise ValueError(f"Entry with type '{payload.type}' and code '{payload.code}' already exists")
    
    db_obj = DynamicData(**payload.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    logger.info(f"Created dynamic data: {payload.type}/{payload.code}")
    return db_obj

def update(db: Session, id: int, payload: DynamicDataUpdate) -> DynamicData:
    """Update a dynamic data entry"""
    db_obj = db.query(DynamicData).filter(DynamicData.id == id).first()
    if not db_obj:
        raise ValueError(f"Dynamic data entry with id {id} not found")
    
    update_data = payload.dict(exclude_unset=True)
    
    # Check for duplicate code if code is being updated
    if 'code' in update_data and update_data['code'] != db_obj.code:
        existing = db.query(DynamicData).filter(
            and_(
                DynamicData.type == db_obj.type,
                DynamicData.code == update_data['code'],
                DynamicData.id != id
            )
        ).first()
        
        if existing:
            raise ValueError(f"Entry with type '{db_obj.type}' and code '{update_data['code']}' already exists")
    
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.commit()
    db.refresh(db_obj)
    logger.info(f"Updated dynamic data: {db_obj.type}/{db_obj.code}")
    return db_obj

def set_status(db: Session, id: int, is_active: bool) -> DynamicData:
    """Set active/inactive status of a dynamic data entry"""
    db_obj = db.query(DynamicData).filter(DynamicData.id == id).first()
    if not db_obj:
        raise ValueError(f"Dynamic data entry with id {id} not found")
    
    db_obj.is_active = is_active
    db.commit()
    db.refresh(db_obj)
    logger.info(f"Set status of {db_obj.type}/{db_obj.code} to {'active' if is_active else 'inactive'}")
    return db_obj

def delete(db: Session, id: int) -> None:
    """Delete a dynamic data entry (hard delete)"""
    db_obj = db.query(DynamicData).filter(DynamicData.id == id).first()
    if not db_obj:
        raise ValueError(f"Dynamic data entry with id {id} not found")
    
    # Log before deletion
    type_code = f"{db_obj.type}/{db_obj.code}"
    
    db.delete(db_obj)
    db.commit()
    logger.info(f"Deleted dynamic data: {type_code}")

def get_all_types(db: Session) -> List[str]:
    """Get all unique types in the system"""
    result = db.query(DynamicData.type).distinct().all()
    return [row[0] for row in result]

def get_by_type_and_code(db: Session, dtype: str, code: str) -> Optional[DynamicData]:
    """Get a specific entry by type and code"""
    return db.query(DynamicData).filter(
        and_(
            DynamicData.type == dtype,
            DynamicData.code == code
        )
    ).first()

def bulk_create(db: Session, entries: List[DynamicDataCreate]) -> List[DynamicData]:
    """Create multiple dynamic data entries"""
    created_entries = []
    
    for entry in entries:
        try:
            db_obj = create(db, entry)
            created_entries.append(db_obj)
        except ValueError as e:
            logger.warning(f"Skipped creating {entry.type}/{entry.code}: {str(e)}")
            continue
    
    return created_entries

def get_pricing_items(db: Session, active_only: bool = True) -> List[DynamicData]:
    """Get pricing items specifically (helper method for quotations)"""
    return list_by_type(db, "pricing_items", active_only)

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