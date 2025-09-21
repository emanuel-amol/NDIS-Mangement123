# backend/app/api/v1/endpoints/dynamic_data.py - COMPLETE FILE
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import distinct, IntegrityError
from pydantic import BaseModel

from app.core.database import get_db
from app.schemas.dynamic_data import DynamicDataOut, DynamicDataCreate, DynamicDataUpdate
from app.services import dynamic_data_service as svc
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
# EXISTING ENDPOINTS
# ==========================================

@router.get("/{dtype}", response_model=List[DynamicDataOut])
def list_dynamic_data(dtype: str, all: bool = Query(False), db: Session = Depends(get_db)):
    """Get all entries for a specific data type"""
    return svc.list_by_type(db, dtype, active_only=(not all))

@router.post("/{dtype}", response_model=DynamicDataOut, dependencies=[Depends(require_admin_key)])
def create_dynamic_data(dtype: str, payload: DynamicDataCreate, db: Session = Depends(get_db)):
    """Create a new entry under an existing data type"""
    # enforce payload.type matches path
    payload.type = dtype
    return svc.create(db, payload)

@router.patch("/{id}", response_model=DynamicDataOut, dependencies=[Depends(require_admin_key)])
def update_dynamic_data(id: int, payload: DynamicDataUpdate, db: Session = Depends(get_db)):
    """Update an existing dynamic data entry"""
    return svc.update(db, id, payload)

@router.patch("/{id}/status", response_model=DynamicDataOut, dependencies=[Depends(require_admin_key)])
def set_status(id: int, is_active: bool = True, db: Session = Depends(get_db)):
    """Set the active/inactive status of a dynamic data entry"""
    return svc.set_status(db, id, is_active)

@router.delete("/{id}", dependencies=[Depends(require_admin_key)])
def delete_dynamic_data(id: int, db: Session = Depends(get_db)):
    """Delete a dynamic data entry"""
    svc.delete(db, id)
    return {"ok": True}

# ==========================================
# NEW TYPE MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/types/list", response_model=TypeListResponse, dependencies=[Depends(require_admin_key)])
def get_types_list(db: Session = Depends(get_db)):
    """Get all available data types"""
    try:
        types = svc.get_all_types(db)
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
        from app.services.dynamic_data_service import DynamicDataService
        
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

@router.get("/types/{type_name}/exists", response_model=TypeExistsResponse, dependencies=[Depends(require_admin_key)])
def check_type_exists(type_name: str, db: Session = Depends(get_db)):
    """Check if a data type already exists"""
    try:
        from app.services.dynamic_data_service import DynamicDataService
        exists = DynamicDataService.type_exists(db, type_name)
        return TypeExistsResponse(exists=exists, type_name=type_name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check type existence: {str(e)}"
        )

@router.delete("/types/{type_name}", response_model=TypeDeleteResponse, dependencies=[Depends(require_admin_key)])
def delete_entire_type(type_name: str, db: Session = Depends(get_db)):
    """
    Delete an entire data type and all its entries.
    WARNING: This is destructive!
    """
    try:
        from app.services.dynamic_data_service import DynamicDataService
        deleted_count = DynamicDataService.delete_type(db, type_name)
        return TypeDeleteResponse(
            message=f"Successfully deleted type '{type_name}' and {deleted_count} entries",
            type_name=type_name,
            deleted_entries=deleted_count
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete type: {str(e)}"
        )

@router.get("/types/{type_name}/stats", dependencies=[Depends(require_admin_key)])
def get_type_statistics(type_name: str, db: Session = Depends(get_db)):
    """Get statistics for a specific data type"""
    try:
        from app.services.dynamic_data_service import DynamicDataService
        
        if not DynamicDataService.type_exists(db, type_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Type '{type_name}' not found"
            )
        
        stats = DynamicDataService.get_type_statistics(db, type_name)
        return stats
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get type statistics: {str(e)}"
        )