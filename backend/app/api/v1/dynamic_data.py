# backend/app/api/v1/dynamic_data.py
from __future__ import annotations

import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.schemas.dynamic_data import (
    DataTypeCreate, DataTypeUpdate, DataTypeResponse, DataTypeWithPointsResponse,
    DataPointCreate, DataPointUpdate, DataPointResponse,
    BulkDataPointCreate, BulkDataPointResponse
)
from app.models.dynamic_data import DataType, DataPoint

router = APIRouter()
log = logging.getLogger(__name__)

def orm_to_data_type_response(obj: DataType) -> DataTypeResponse:
    """Convert ORM DataType to response schema"""
    return DataTypeResponse(
        id=str(obj.id),
        name=obj.name,
        display_name=obj.display_name,
        description=obj.description,
        is_active=obj.is_active,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )

def orm_to_data_point_response(obj: DataPoint) -> DataPointResponse:
    """Convert ORM DataPoint to response schema"""
    return DataPointResponse(
        id=str(obj.id),
        data_type_id=str(obj.data_type_id),
        name=obj.name,
        description=obj.description,
        sort_order=obj.sort_order,
        is_active=obj.is_active,
        extra_data=obj.extra_data,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )

# ========== DATA TYPES ENDPOINTS ==========

@router.get(
    "/data-types",
    response_model=List[DataTypeResponse],
    name="get_data_types",
)
def get_data_types(
    active_only: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db)
) -> List[DataTypeResponse]:
    """Get all data types with optional filtering"""
    query = db.query(DataType)
    
    if active_only:
        query = query.filter(DataType.is_active == True)
    
    data_types = query.order_by(DataType.display_name).all()
    return [orm_to_data_type_response(dt) for dt in data_types]

@router.get(
    "/data-types/{data_type_name}/points",
    response_model=List[DataPointResponse],
    name="get_data_points_by_type_name",
)
def get_data_points_by_type_name(
    data_type_name: str,
    active_only: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db)
) -> List[DataPointResponse]:
    """Get data points by data type name (convenient for frontend)"""
    data_type = db.query(DataType).filter(DataType.name == data_type_name.lower()).first()
    if not data_type:
        raise HTTPException(status_code=404, detail="Data type not found")
    
    query = db.query(DataPoint).filter(DataPoint.data_type_id == data_type.id)
    
    if active_only:
        query = query.filter(DataPoint.is_active == True)
    
    data_points = query.order_by(DataPoint.sort_order, DataPoint.name).all()
    return [orm_to_data_point_response(dp) for dp in data_points]

# ========== DATA POINTS ENDPOINTS ==========

@router.post(
    "/data-points",
    response_model=DataPointResponse,
    status_code=201,
    name="create_data_point",
)
def create_data_point(payload: DataPointCreate, db: Session = Depends(get_db)) -> DataPointResponse:
    """Create a new data point within a data type"""
    try:
        # Verify data type exists
        data_type = db.get(DataType, payload.data_type_id)
        if not data_type:
            raise HTTPException(status_code=404, detail="Data type not found")

        now = datetime.utcnow()
        data_point = DataPoint(
            data_type_id=payload.data_type_id,
            name=payload.name,
            description=payload.description,
            sort_order=payload.sort_order,
            is_active=payload.is_active,
            extra_data=payload.extra_data,
            created_at=now,
            updated_at=now,
        )
        db.add(data_point)
        db.commit()
        db.refresh(data_point)
        return orm_to_data_point_response(data_point)

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Data point with this name already exists in this data type")
    except Exception as e:
        db.rollback()
        log.exception("Create data point failed")
        raise HTTPException(status_code=500, detail=f"Data point creation failed: {str(e)}")

@router.put(
    "/data-points/{data_point_id}",
    response_model=DataPointResponse,
    name="update_data_point",
)
def update_data_point(
    data_point_id: str, 
    payload: DataPointUpdate, 
    db: Session = Depends(get_db)
) -> DataPointResponse:
    """Update a data point"""
    try:
        data_point = db.get(DataPoint, data_point_id)
        if not data_point:
            raise HTTPException(status_code=404, detail="Data point not found")

        # Update only provided fields
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(data_point, field, value)

        data_point.updated_at = datetime.utcnow()
        db.add(data_point)
        db.commit()
        db.refresh(data_point)
        return orm_to_data_point_response(data_point)

    except Exception as e:
        db.rollback()
        log.exception("Update data point failed")
        raise HTTPException(status_code=500, detail=f"Data point update failed: {str(e)}")

@router.delete(
    "/data-points/{data_point_id}",
    name="delete_data_point",
)
def delete_data_point(data_point_id: str, db: Session = Depends(get_db)) -> dict:
    """Delete a data point"""
    try:
        data_point = db.get(DataPoint, data_point_id)
        if not data_point:
            raise HTTPException(status_code=404, detail="Data point not found")
        
        db.delete(data_point)
        db.commit()
        return {"ok": True, "deleted": data_point_id}
    except Exception as e:
        db.rollback()
        log.exception("Delete data point failed")
        raise HTTPException(status_code=500, detail=f"Data point delete failed: {str(e)}")