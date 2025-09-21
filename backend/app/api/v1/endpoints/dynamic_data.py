# backend/app/api/v1/endpoints/dynamic_data.py - FIXED VERSION
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import distinct, and_
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from app.core.database import get_db
from app.schemas.dynamic_data import DynamicDataOut, DynamicDataCreate, DynamicDataUpdate
# CRITICAL FIX: Import the CLASS, not the module
from app.services.dynamic_data_service import DynamicDataService
from app.api.deps_admin_key import require_admin_key

# Pydantic models for type creation
class NewTypeRequest(BaseModel):
    type_name: str
    description: Optional[str] = None
    first_entry: Dict[str, Any]

class TypeListResponse(BaseModel):
    types: List[str]

class TypeExistsResponse(BaseModel):
    exists: bool
    type_name: str

class TypeDeleteResponse(BaseModel):
    message: str
    type_name: str
    deleted_entries: int

router = APIRouter(tags=["dynamic-data"])

# ==========================================
# FIXED ENDPOINTS - NO MORE MODULE IMPORT ISSUES
# ==========================================

@router.get("/{dtype}", response_model=List[DynamicDataOut])
def list_dynamic_data(dtype: str, all: bool = Query(False), db: Session = Depends(get_db)):
    """Get all entries for a specific data type"""
    # FIXED: Use the CLASS method, not module function
    return DynamicDataService.get_by_type(db, dtype, active_only=(not all))

@router.post("/{dtype}", response_model=DynamicDataOut, dependencies=[Depends(require_admin_key)])
def create_dynamic_data(dtype: str, payload: DynamicDataCreate, db: Session = Depends(get_db)):
    """Create a new entry under an existing data type"""
    # enforce payload.type matches path
    payload.type = dtype
    # FIXED: Use the CLASS method
    return DynamicDataService.create_entry(db, payload.dict())

@router.patch("/{id}", response_model=DynamicDataOut, dependencies=[Depends(require_admin_key)])
def update_dynamic_data(id: int, payload: DynamicDataUpdate, db: Session = Depends(get_db)):
    """Update an existing dynamic data entry"""
    # FIXED: Use the CLASS method
    return DynamicDataService.update_entry(db, id, payload.dict(exclude_unset=True))

@router.patch("/{id}/status", response_model=DynamicDataOut, dependencies=[Depends(require_admin_key)])
def set_status(id: int, is_active: bool = True, db: Session = Depends(get_db)):
    """Set the active/inactive status of a dynamic data entry"""
    # FIXED: Use the CLASS method
    return DynamicDataService.set_status(db, id, is_active)

@router.delete("/{id}", dependencies=[Depends(require_admin_key)])
def delete_dynamic_data(id: int, db: Session = Depends(get_db)):
    """Delete a dynamic data entry"""
    # FIXED: Use the CLASS method
    DynamicDataService.delete_entry(db, id)
    return {"ok": True}

# ==========================================
# NEW TYPE MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/types/list", response_model=TypeListResponse, dependencies=[Depends(require_admin_key)])
def get_types_list(db: Session = Depends(get_db)):
    """Get all available data types"""
    try:
        # FIXED: Use the CLASS method
        types = DynamicDataService.get_all_types(db)
        return TypeListResponse(types=types)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get types list: {str(e)}"
        )

@router.post("/types/create", response_model=DynamicDataOut, dependencies=[Depends(require_admin_key)])
def create_new_type(request: NewTypeRequest, db: Session = Depends(get_db)):
    """
    Create a new data type by adding the first entry under that type.
    This effectively creates the type since types are defined by their usage.
    """
    try:
        # FIXED: Use the CLASS method
        new_entry = DynamicDataService.create_new_type(
            db=db,
            type_name=request.type_name,
            first_entry=request.first_entry
        )
        
        return DynamicDataOut(
            id=new_entry.id,
            type=new_entry.type,
            code=new_entry.code,
            label=new_entry.label,
            is_active=new_entry.is_active,
            meta=new_entry.meta
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate type or entry code"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create new type: {str(e)}"
        )