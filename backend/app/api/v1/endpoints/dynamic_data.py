# backend/app/api/v1/endpoints/dynamic_data.py - FIXED VERSION
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.dynamic_data import DynamicDataOut, DynamicDataCreate, DynamicDataUpdate
from app.services import dynamic_data_service as svc
from app.api.deps_admin_key import require_admin_key  # admin write-guard

# FIXED: Remove prefix here since it's added in api.py
router = APIRouter(tags=["dynamic-data"])

@router.get("/{dtype}", response_model=List[DynamicDataOut])
def list_dynamic_data(dtype: str, all: bool = Query(False), db: Session = Depends(get_db)):
    return svc.list_by_type(db, dtype, active_only=(not all))

@router.post("/{dtype}", response_model=DynamicDataOut, dependencies=[Depends(require_admin_key)])
def create_dynamic_data(dtype: str, payload: DynamicDataCreate, db: Session = Depends(get_db)):
    # enforce payload.type matches path
    payload.type = dtype
    return svc.create(db, payload)

@router.patch("/{id}", response_model=DynamicDataOut, dependencies=[Depends(require_admin_key)])
def update_dynamic_data(id: int, payload: DynamicDataUpdate, db: Session = Depends(get_db)):
    return svc.update(db, id, payload)

@router.patch("/{id}/status", response_model=DynamicDataOut, dependencies=[Depends(require_admin_key)])
def set_status(id: int, is_active: bool = True, db: Session = Depends(get_db)):
    return svc.set_status(db, id, is_active)

@router.delete("/{id}", dependencies=[Depends(require_admin_key)])
def delete_dynamic_data(id: int, db: Session = Depends(get_db)):
    svc.delete(db, id)
    return {"ok": True}