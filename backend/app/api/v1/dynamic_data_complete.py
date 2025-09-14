# backend/app/api/v1/dynamic_data_complete.py
from __future__ import annotations

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.schemas.dynamic_data import (
    DataTypeCreate, DataTypeUpdate, DataTypeResponse, DataTypeWithPointsResponse,
    DataPointCreate, DataPointUpdate, DataPointResponse,
    BulkDataPointCreate, BulkDataPointResponse
)
from app.services.dynamic_data_service import DynamicDataService
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
    summary="Get all data types",
    description="Retrieve all data types with optional filtering by active status"
)
def get_data_types(
    active_only: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db)
) -> List[DataTypeResponse]:
    """Get all data types with optional filtering"""
    try:
        data_types = DynamicDataService.get_data_types(db, active_only=active_only)
        return [orm_to_data_type_response(dt) for dt in data_types]
    except Exception as e:
        log.exception("Failed to get data types")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve data types: {str(e)}"
        )

@router.post(
    "/data-types",
    response_model=DataTypeResponse,
    status_code=status.HTTP_201_CREATED,
    name="create_data_type",
    summary="Create a new data type",
    description="Create a new data type category"
)
def create_data_type(
    payload: DataTypeCreate, 
    db: Session = Depends(get_db)
) -> DataTypeResponse:
    """Create a new data type"""
    try:
        data_type = DynamicDataService.create_data_type(db, payload)
        return orm_to_data_type_response(data_type)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Data type with this name already exists"
        )
    except Exception as e:
        db.rollback()
        log.exception("Create data type failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data type creation failed: {str(e)}"
        )

@router.get(
    "/data-types/{data_type_name}",
    response_model=DataTypeWithPointsResponse,
    name="get_data_type_with_points",
    summary="Get data type with all points",
    description="Retrieve a specific data type along with all its data points"
)
def get_data_type_with_points(
    data_type_name: str,
    db: Session = Depends(get_db)
) -> DataTypeWithPointsResponse:
    """Get data type with all its data points"""
    try:
        result = DynamicDataService.get_data_type_with_points(db, data_type_name)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data type not found"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Failed to get data type with points")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve data type: {str(e)}"
        )

@router.put(
    "/data-types/{data_type_id}",
    response_model=DataTypeResponse,
    name="update_data_type",
    summary="Update a data type",
    description="Update an existing data type's properties"
)
def update_data_type(
    data_type_id: str,
    payload: DataTypeUpdate,
    db: Session = Depends(get_db)
) -> DataTypeResponse:
    """Update a data type"""
    try:
        data_type = DynamicDataService.update_data_type(db, data_type_id, payload)
        if not data_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data type not found"
            )
        return orm_to_data_type_response(data_type)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log.exception("Update data type failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data type update failed: {str(e)}"
        )

@router.get(
    "/data-types/{data_type_name}/points",
    response_model=List[DataPointResponse],
    name="get_data_points_by_type_name",
    summary="Get data points by type name",
    description="Get all data points for a specific data type (convenient for frontend)"
)
def get_data_points_by_type_name(
    data_type_name: str,
    active_only: bool = Query(True, description="Filter by active status"),
    db: Session = Depends(get_db)
) -> List[DataPointResponse]:
    """Get data points by data type name (convenient for frontend)"""
    try:
        data_points = DynamicDataService.get_data_points_by_type_name(
            db, data_type_name, active_only=active_only
        )
        return [orm_to_data_point_response(dp) for dp in data_points]
    except Exception as e:
        log.exception("Failed to get data points by type name")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve data points: {str(e)}"
        )

# ========== DATA POINTS ENDPOINTS ==========

@router.post(
    "/data-points",
    response_model=DataPointResponse,
    status_code=status.HTTP_201_CREATED,
    name="create_data_point",
    summary="Create a new data point",
    description="Create a new data point within a data type"
)
def create_data_point(
    payload: DataPointCreate, 
    db: Session = Depends(get_db)
) -> DataPointResponse:
    """Create a new data point within a data type"""
    try:
        data_point = DynamicDataService.create_data_point(db, payload)
        return orm_to_data_point_response(data_point)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Data point with this name already exists in this data type"
        )
    except Exception as e:
        db.rollback()
        log.exception("Create data point failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data point creation failed: {str(e)}"
        )

@router.get(
    "/data-points/{data_point_id}",
    response_model=DataPointResponse,
    name="get_data_point",
    summary="Get a specific data point",
    description="Retrieve a specific data point by ID"
)
def get_data_point(
    data_point_id: str,
    db: Session = Depends(get_db)
) -> DataPointResponse:
    """Get a specific data point"""
    try:
        data_point = db.query(DataPoint).filter(DataPoint.id == data_point_id).first()
        if not data_point:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data point not found"
            )
        return orm_to_data_point_response(data_point)
    except HTTPException:
        raise
    except Exception as e:
        log.exception("Failed to get data point")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve data point: {str(e)}"
        )

@router.put(
    "/data-points/{data_point_id}",
    response_model=DataPointResponse,
    name="update_data_point",
    summary="Update a data point",
    description="Update an existing data point's properties"
)
def update_data_point(
    data_point_id: str, 
    payload: DataPointUpdate, 
    db: Session = Depends(get_db)
) -> DataPointResponse:
    """Update a data point"""
    try:
        data_point = DynamicDataService.update_data_point(db, data_point_id, payload)
        if not data_point:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data point not found"
            )
        return orm_to_data_point_response(data_point)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log.exception("Update data point failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data point update failed: {str(e)}"
        )

@router.delete(
    "/data-points/{data_point_id}",
    name="delete_data_point",
    summary="Delete a data point",
    description="Delete an existing data point"
)
def delete_data_point(
    data_point_id: str, 
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Delete a data point"""
    try:
        success = DynamicDataService.delete_data_point(db, data_point_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data point not found"
            )
        return {"ok": True, "deleted": data_point_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log.exception("Delete data point failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data point delete failed: {str(e)}"
        )

# ========== BULK OPERATIONS ==========

@router.post(
    "/data-points/bulk",
    response_model=BulkDataPointResponse,
    status_code=status.HTTP_201_CREATED,
    name="bulk_create_data_points",
    summary="Bulk create data points",
    description="Create multiple data points at once for a data type"
)
def bulk_create_data_points(
    payload: BulkDataPointCreate,
    db: Session = Depends(get_db)
) -> BulkDataPointResponse:
    """Create multiple data points at once"""
    try:
        result = DynamicDataService.bulk_create_data_points(db, payload)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        log.exception("Bulk create data points failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk data point creation failed: {str(e)}"
        )

# ========== SEARCH AND UTILITY ENDPOINTS ==========

@router.get(
    "/search",
    response_model=List[DataPointResponse],
    name="search_data_points",
    summary="Search data points",
    description="Search data points by name or description across all or specific data types"
)
def search_data_points(
    q: str = Query(..., description="Search query"),
    data_type: Optional[str] = Query(None, description="Limit search to specific data type"),
    db: Session = Depends(get_db)
) -> List[DataPointResponse]:
    """Search data points by name or description"""
    try:
        data_points = DynamicDataService.search_data_points(db, q, data_type)
        return [orm_to_data_point_response(dp) for dp in data_points]
    except Exception as e:
        log.exception("Search data points failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@router.post(
    "/initialize",
    name="initialize_default_data",
    summary="Initialize default data",
    description="Initialize the system with default data types and points (admin only)"
)
def initialize_default_data(
    db: Session = Depends(get_db)
) -> Dict[str, str]:
    """Initialize default data types and points for the system"""
    try:
        DynamicDataService.initialize_default_data_types(db)
        return {"message": "Default data types and points initialized successfully"}
    except Exception as e:
        db.rollback()
        log.exception("Initialize default data failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Initialization failed: {str(e)}"
        )

# ========== STATUS AND HEALTH CHECKS ==========

@router.get(
    "/status",
    name="dynamic_data_status",
    summary="Get system status",
    description="Get status of dynamic data system including counts and health"
)
def get_dynamic_data_status(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get status of dynamic data system"""
    try:
        data_types = DynamicDataService.get_data_types(db, active_only=False)
        
        stats = {}
        total_points = 0
        
        for data_type in data_types:
            points = DynamicDataService.get_data_points_by_type_id(
                db, str(data_type.id), active_only=False
            )
            stats[data_type.name] = {
                "display_name": data_type.display_name,
                "points_count": len(points),
                "is_active": data_type.is_active
            }
            total_points += len(points)
        
        return {
            "status": "operational",
            "total_data_types": len(data_types),
            "total_data_points": total_points,
            "data_types": stats
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

# ========== CONVENIENCE ENDPOINTS FOR COMMON DATA TYPES ==========

@router.get(
    "/disability-types",
    response_model=List[DataPointResponse],
    name="get_disability_types",
    summary="Get disability types",
    description="Convenience endpoint to get all disability types"
)
def get_disability_types(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
) -> List[DataPointResponse]:
    """Get all disability types"""
    data_points = DynamicDataService.get_data_points_by_type_name(
        db, "disability_types", active_only=active_only
    )
    return [orm_to_data_point_response(dp) for dp in data_points]

@router.get(
    "/service-types",
    response_model=List[DataPointResponse],
    name="get_service_types",
    summary="Get service types",
    description="Convenience endpoint to get all service types"
)
def get_service_types(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
) -> List[DataPointResponse]:
    """Get all service types"""
    data_points = DynamicDataService.get_data_points_by_type_name(
        db, "service_types", active_only=active_only
    )
    return [orm_to_data_point_response(dp) for dp in data_points]

@router.get(
    "/plan-types",
    response_model=List[DataPointResponse],
    name="get_plan_types",
    summary="Get plan types",
    description="Convenience endpoint to get all NDIS plan types"
)
def get_plan_types(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
) -> List[DataPointResponse]:
    """Get all plan types"""
    data_points = DynamicDataService.get_data_points_by_type_name(
        db, "plan_types", active_only=active_only
    )
    return [orm_to_data_point_response(dp) for dp in data_points]

@router.get(
    "/contact-methods",
    response_model=List[DataPointResponse],
    name="get_contact_methods",
    summary="Get contact methods",
    description="Convenience endpoint to get all contact methods"
)
def get_contact_methods(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
) -> List[DataPointResponse]:
    """Get all contact methods"""
    data_points = DynamicDataService.get_data_points_by_type_name(
        db, "contact_methods", active_only=active_only
    )
    return [orm_to_data_point_response(dp) for dp in data_points]

@router.get(
    "/support-categories",
    response_model=List[DataPointResponse],
    name="get_support_categories",
    summary="Get support categories",
    description="Convenience endpoint to get all support categories"
)
def get_support_categories(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
) -> List[DataPointResponse]:
    """Get all support categories"""
    data_points = DynamicDataService.get_data_points_by_type_name(
        db, "support_categories", active_only=active_only
    )
    return [orm_to_data_point_response(dp) for dp in data_points]

@router.get(
    "/urgency-levels",
    response_model=List[DataPointResponse],
    name="get_urgency_levels",
    summary="Get urgency levels",
    description="Convenience endpoint to get all urgency levels"
)
def get_urgency_levels(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
) -> List[DataPointResponse]:
    """Get all urgency levels"""
    data_points = DynamicDataService.get_data_points_by_type_name(
        db, "urgency_levels", active_only=active_only
    )
    return [orm_to_data_point_response(dp) for dp in data_points]

# ========== ADMIN ONLY ENDPOINTS ==========

@router.delete(
    "/data-types/{data_type_id}",
    name="delete_data_type",
    summary="Delete a data type (Admin Only)",
    description="Delete a data type and all its data points"
)
def delete_data_type(
    data_type_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Delete a data type and all its points"""
    try:
        # Check if data type exists
        data_type = db.query(DataType).filter(DataType.id == data_type_id).first()
        if not data_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data type not found"
            )
        
        # Delete all associated data points first
        deleted_points = db.query(DataPoint).filter(DataPoint.data_type_id == data_type_id).count()
        db.query(DataPoint).filter(DataPoint.data_type_id == data_type_id).delete()
        
        # Delete the data type
        db.delete(data_type)
        db.commit()
        
        return {
            "ok": True, 
            "deleted": data_type_id,
            "deleted_points_count": deleted_points,
            "message": f"Deleted data type '{data_type.name}' and {deleted_points} associated points"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log.exception("Delete data type failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Data type delete failed: {str(e)}"
        )

@router.post(
    "/reset",
    name="reset_dynamic_data",
    summary="Reset all dynamic data (Admin Only)",
    description="Clear all existing data and reinitialize with defaults"
)
def reset_dynamic_data(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Reset all dynamic data to defaults"""
    try:
        # Count existing data
        existing_types = db.query(DataType).count()
        existing_points = db.query(DataPoint).count()
        
        # Delete all data points first (foreign key constraint)
        db.query(DataPoint).delete()
        db.commit()
        
        # Delete all data types
        db.query(DataType).delete()
        db.commit()
        
        # Reinitialize with defaults
        DynamicDataService.initialize_default_data_types(db)
        
        # Count new data
        new_types = db.query(DataType).count()
        new_points = db.query(DataPoint).count()
        
        return {
            "ok": True,
            "message": "Dynamic data reset successfully",
            "removed": {
                "data_types": existing_types,
                "data_points": existing_points
            },
            "created": {
                "data_types": new_types,
                "data_points": new_points
            }
        }
    except Exception as e:
        db.rollback()
        log.exception("Reset dynamic data failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reset failed: {str(e)}"
        )