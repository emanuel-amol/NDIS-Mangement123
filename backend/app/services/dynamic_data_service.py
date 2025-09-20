# backend/app/services/dynamic_data_service.py
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.dynamic_data import DynamicData
from app.schemas.dynamic_data import DynamicDataCreate, DynamicDataUpdate

def list_by_type(db: Session, dtype: str, active_only: bool = True) -> List[DynamicData]:
    q = db.query(DynamicData).filter(DynamicData.type == dtype)
    if active_only:
        q = q.filter(DynamicData.is_active.is_(True))
    return q.order_by(DynamicData.label.asc()).all()

def create(db: Session, payload: DynamicDataCreate) -> DynamicData:
    exists = db.query(DynamicData).filter(
        DynamicData.type == payload.type,
        DynamicData.code == payload.code
    ).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry with same type+code already exists")
    obj = DynamicData(
        type=payload.type,
        code=payload.code,
        label=payload.label,
        is_active=payload.is_active,
        meta=payload.meta,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def update(db: Session, id_: int, payload: DynamicDataUpdate) -> DynamicData:
    obj: Optional[DynamicData] = db.query(DynamicData).get(id_)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dynamic data not found")

    if payload.code and payload.code != obj.code:
        dup = db.query(DynamicData).filter(
            DynamicData.type == obj.type,
            DynamicData.code == payload.code
        ).first()
        if dup:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Entry with same type+code already exists")

    if payload.code is not None:
        obj.code = payload.code
    if payload.label is not None:
        obj.label = payload.label
    if payload.is_active is not None:
        obj.is_active = payload.is_active
    if payload.meta is not None:
        obj.meta = payload.meta

    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def set_status(db: Session, id_: int, is_active: bool) -> DynamicData:
    obj: Optional[DynamicData] = db.query(DynamicData).get(id_)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dynamic data not found")
    obj.is_active = is_active
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def delete(db: Session, id_: int) -> None:
    obj: Optional[DynamicData] = db.query(DynamicData).get(id_)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dynamic data not found")
    db.delete(obj)
    db.commit()
