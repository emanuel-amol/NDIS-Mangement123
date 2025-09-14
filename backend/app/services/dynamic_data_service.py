# backend/app/services/dynamic_data_service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.models.dynamic_data import DataType, DataPoint
from app.schemas.dynamic_data import (
    DataTypeCreate, DataTypeUpdate, DataTypeResponse, DataTypeWithPointsResponse,
    DataPointCreate, DataPointUpdate, DataPointResponse,
    BulkDataPointCreate, BulkDataPointResponse
)

class DynamicDataService:
    """Service for managing dynamic data types and points"""
    
    @staticmethod
    def get_data_types(db: Session, active_only: bool = True) -> List[DataType]:
        """Get all data types"""
        query = db.query(DataType)
        if active_only:
            query = query.filter(DataType.is_active == True)
        return query.order_by(DataType.display_name).all()
    
    @staticmethod
    def get_data_type_by_name(db: Session, name: str) -> Optional[DataType]:
        """Get data type by name"""
        return db.query(DataType).filter(DataType.name == name.lower()).first()
    
    @staticmethod
    def create_data_type(db: Session, data_type: DataTypeCreate) -> DataType:
        """Create a new data type"""
        db_data_type = DataType(
            name=data_type.name.lower(),
            display_name=data_type.display_name,
            description=data_type.description,
            is_active=data_type.is_active
        )
        db.add(db_data_type)
        db.commit()
        db.refresh(db_data_type)
        return db_data_type
    
    @staticmethod
    def update_data_type(db: Session, data_type_id: str, updates: DataTypeUpdate) -> Optional[DataType]:
        """Update a data type"""
        db_data_type = db.query(DataType).filter(DataType.id == data_type_id).first()
        if not db_data_type:
            return None
        
        update_data = updates.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'name' and value:
                value = value.lower()
            setattr(db_data_type, field, value)
        
        db_data_type.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_data_type)
        return db_data_type
    
    @staticmethod
    def get_data_points_by_type_name(
        db: Session, 
        type_name: str, 
        active_only: bool = True
    ) -> List[DataPoint]:
        """Get data points by data type name"""
        data_type = DynamicDataService.get_data_type_by_name(db, type_name)
        if not data_type:
            return []
        
        query = db.query(DataPoint).filter(DataPoint.data_type_id == data_type.id)
        if active_only:
            query = query.filter(DataPoint.is_active == True)
        
        return query.order_by(DataPoint.sort_order, DataPoint.name).all()
    
    @staticmethod
    def get_data_points_by_type_id(
        db: Session, 
        type_id: str, 
        active_only: bool = True
    ) -> List[DataPoint]:
        """Get data points by data type ID"""
        query = db.query(DataPoint).filter(DataPoint.data_type_id == type_id)
        if active_only:
            query = query.filter(DataPoint.is_active == True)
        
        return query.order_by(DataPoint.sort_order, DataPoint.name).all()
    
    @staticmethod
    def create_data_point(db: Session, data_point: DataPointCreate) -> DataPoint:
        """Create a new data point"""
        # Verify data type exists
        data_type = db.query(DataType).filter(DataType.id == data_point.data_type_id).first()
        if not data_type:
            raise ValueError("Data type not found")
        
        db_data_point = DataPoint(
            data_type_id=data_point.data_type_id,
            name=data_point.name.lower(),
            description=data_point.description,
            sort_order=data_point.sort_order,
            is_active=data_point.is_active,
            extra_data=data_point.extra_data
        )
        db.add(db_data_point)
        db.commit()
        db.refresh(db_data_point)
        return db_data_point
    
    @staticmethod
    def update_data_point(db: Session, point_id: str, updates: DataPointUpdate) -> Optional[DataPoint]:
        """Update a data point"""
        db_data_point = db.query(DataPoint).filter(DataPoint.id == point_id).first()
        if not db_data_point:
            return None
        
        update_data = updates.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == 'name' and value:
                value = value.lower()
            setattr(db_data_point, field, value)
        
        db_data_point.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_data_point)
        return db_data_point
    
    @staticmethod
    def delete_data_point(db: Session, point_id: str) -> bool:
        """Delete a data point"""
        db_data_point = db.query(DataPoint).filter(DataPoint.id == point_id).first()
        if not db_data_point:
            return False
        
        db.delete(db_data_point)
        db.commit()
        return True
    
    @staticmethod
    def bulk_create_data_points(
        db: Session, 
        bulk_data: BulkDataPointCreate
    ) -> BulkDataPointResponse:
        """Create multiple data points at once"""
        # Verify data type exists
        data_type = db.query(DataType).filter(DataType.id == bulk_data.data_type_id).first()
        if not data_type:
            raise ValueError("Data type not found")
        
        created_points = []
        for point_data in bulk_data.data_points:
            db_data_point = DataPoint(
                data_type_id=bulk_data.data_type_id,
                name=point_data.name.lower(),
                description=point_data.description,
                sort_order=point_data.sort_order,
                is_active=point_data.is_active,
                extra_data=point_data.extra_data
            )
            db.add(db_data_point)
            created_points.append(db_data_point)
        
        db.commit()
        for point in created_points:
            db.refresh(point)
        
        return BulkDataPointResponse(
            created_count=len(created_points),
            data_points=[DataPointResponse.model_validate(point) for point in created_points]
        )
    
    @staticmethod
    def search_data_points(
        db: Session, 
        query: str, 
        data_type_name: Optional[str] = None
    ) -> List[DataPoint]:
        """Search data points by name or description"""
        search_query = db.query(DataPoint).filter(
            or_(
                DataPoint.name.ilike(f"%{query.lower()}%"),
                DataPoint.description.ilike(f"%{query}%")
            )
        )
        
        if data_type_name:
            data_type = DynamicDataService.get_data_type_by_name(db, data_type_name)
            if data_type:
                search_query = search_query.filter(DataPoint.data_type_id == data_type.id)
        
        return search_query.order_by(DataPoint.sort_order, DataPoint.name).all()
    
    @staticmethod
    def get_data_type_with_points(db: Session, type_name: str) -> Optional[DataTypeWithPointsResponse]:
        """Get data type with all its data points"""
        data_type = DynamicDataService.get_data_type_by_name(db, type_name)
        if not data_type:
            return None
        
        data_points = DynamicDataService.get_data_points_by_type_id(
            db, str(data_type.id), active_only=False
        )
        
        return DataTypeWithPointsResponse(
            id=str(data_type.id),
            name=data_type.name,
            display_name=data_type.display_name,
            description=data_type.description,
            is_active=data_type.is_active,
            created_at=data_type.created_at,
            updated_at=data_type.updated_at,
            data_points=[DataPointResponse.model_validate(point) for point in data_points]
        )
    
    @staticmethod
    def initialize_default_data_types(db: Session):
        """Initialize default data types and points for the system"""
        default_data = {
            'disability_types': {
                'display_name': 'Disability Types',
                'description': 'Types of disabilities supported by NDIS',
                'points': [
                    {'name': 'intellectual', 'description': 'Intellectual Disability', 'sort_order': 1},
                    {'name': 'physical', 'description': 'Physical Disability', 'sort_order': 2},
                    {'name': 'sensory', 'description': 'Sensory Disability', 'sort_order': 3},
                    {'name': 'autism', 'description': 'Autism Spectrum Disorder', 'sort_order': 4},
                    {'name': 'psychosocial', 'description': 'Psychosocial Disability', 'sort_order': 5},
                    {'name': 'neurological', 'description': 'Neurological Disability', 'sort_order': 6},
                ]
            },
            'contact_methods': {
                'display_name': 'Contact Methods',
                'description': 'Preferred contact methods for participants',
                'points': [
                    {'name': 'phone', 'description': 'Phone Call', 'sort_order': 1},
                    {'name': 'email', 'description': 'Email', 'sort_order': 2},
                    {'name': 'sms', 'description': 'SMS/Text Message', 'sort_order': 3},
                    {'name': 'mail', 'description': 'Postal Mail', 'sort_order': 4},
                ]
            },
            'plan_types': {
                'display_name': 'Plan Types',
                'description': 'NDIS plan management types',
                'points': [
                    {'name': 'self-managed', 'description': 'Self-Managed', 'sort_order': 1},
                    {'name': 'plan-managed', 'description': 'Plan-Managed', 'sort_order': 2},
                    {'name': 'agency-managed', 'description': 'NDIA-Managed', 'sort_order': 3},
                ]
            },
            'service_types': {
                'display_name': 'Service Types',
                'description': 'Types of services offered',
                'points': [
                    {'name': 'physiotherapy', 'description': 'Physiotherapy', 'sort_order': 1},
                    {'name': 'chiro', 'description': 'Chiropractic', 'sort_order': 2},
                    {'name': 'psychologist', 'description': 'Psychology', 'sort_order': 3},
                    {'name': 'occupational_therapy', 'description': 'Occupational Therapy', 'sort_order': 4},
                    {'name': 'speech_pathology', 'description': 'Speech Pathology', 'sort_order': 5},
                    {'name': 'support_coordination', 'description': 'Support Coordination', 'sort_order': 6},
                ]
            },
            'support_categories': {
                'display_name': 'Support Categories',
                'description': 'Categories of NDIS supports',
                'points': [
                    {'name': 'core_supports', 'description': 'Core Supports', 'sort_order': 1},
                    {'name': 'capital_supports', 'description': 'Capital Supports', 'sort_order': 2},
                    {'name': 'capacity_building', 'description': 'Capacity Building', 'sort_order': 3},
                ]
            },
            'urgency_levels': {
                'display_name': 'Urgency Levels',
                'description': 'Priority levels for referrals',
                'points': [
                    {'name': 'low', 'description': 'Low - Non-urgent', 'sort_order': 1},
                    {'name': 'medium', 'description': 'Medium - Standard priority', 'sort_order': 2},
                    {'name': 'high', 'description': 'High - Urgent', 'sort_order': 3},
                    {'name': 'critical', 'description': 'Critical - Immediate attention required', 'sort_order': 4},
                ]
            },
            'risk_categories': {
                'display_name': 'Risk Categories',
                'description': 'Types of risks to assess',
                'points': [
                    {'name': 'physical_safety', 'description': 'Physical Safety', 'sort_order': 1},
                    {'name': 'medication', 'description': 'Medication Management', 'sort_order': 2},
                    {'name': 'behavioral', 'description': 'Behavioral Risks', 'sort_order': 3},
                    {'name': 'environmental', 'description': 'Environmental Hazards', 'sort_order': 4},
                    {'name': 'social', 'description': 'Social Risks', 'sort_order': 5},
                ]
            },
            'goal_categories': {
                'display_name': 'Goal Categories',
                'description': 'Categories for participant goals',
                'points': [
                    {'name': 'independence', 'description': 'Independence & Daily Living', 'sort_order': 1},
                    {'name': 'social', 'description': 'Social & Community Participation', 'sort_order': 2},
                    {'name': 'employment', 'description': 'Employment & Education', 'sort_order': 3},
                    {'name': 'health', 'description': 'Health & Wellbeing', 'sort_order': 4},
                ]
            },
            'risk_likelihood': {
                'display_name': 'Risk Likelihood',
                'description': 'Likelihood levels for risk assessment',
                'points': [
                    {'name': 'very_low', 'description': 'Very Low', 'sort_order': 1},
                    {'name': 'low', 'description': 'Low', 'sort_order': 2},
                    {'name': 'medium', 'description': 'Medium', 'sort_order': 3},
                    {'name': 'high', 'description': 'High', 'sort_order': 4},
                    {'name': 'very_high', 'description': 'Very High', 'sort_order': 5},
                ]
            },
            'risk_impact': {
                'display_name': 'Risk Impact',
                'description': 'Impact levels for risk assessment',
                'points': [
                    {'name': 'very_low', 'description': 'Very Low', 'sort_order': 1},
                    {'name': 'low', 'description': 'Low', 'sort_order': 2},
                    {'name': 'medium', 'description': 'Medium', 'sort_order': 3},
                    {'name': 'high', 'description': 'High', 'sort_order': 4},
                    {'name': 'very_high', 'description': 'Very High', 'sort_order': 5},
                ]
            },
            'support_frequencies': {
                'display_name': 'Support Frequencies',
                'description': 'How often supports are provided',
                'points': [
                    {'name': 'daily', 'description': 'Daily', 'sort_order': 1},
                    {'name': 'weekly', 'description': 'Weekly', 'sort_order': 2},
                    {'name': 'fortnightly', 'description': 'Fortnightly', 'sort_order': 3},
                    {'name': 'monthly', 'description': 'Monthly', 'sort_order': 4},
                    {'name': 'as_needed', 'description': 'As Needed', 'sort_order': 5},
                ]
            },
            'support_durations': {
                'display_name': 'Support Durations',
                'description': 'Duration of support sessions',
                'points': [
                    {'name': '30_min', 'description': '30 minutes', 'sort_order': 1},
                    {'name': '1_hour', 'description': '1 hour', 'sort_order': 2},
                    {'name': '2_hours', 'description': '2 hours', 'sort_order': 3},
                    {'name': '4_hours', 'description': '4 hours', 'sort_order': 4},
                    {'name': '8_hours', 'description': '8 hours', 'sort_order': 5},
                ]
            },
            'support_locations': {
                'display_name': 'Support Locations',
                'description': 'Where supports are provided',
                'points': [
                    {'name': 'home', 'description': 'Participant\'s Home', 'sort_order': 1},
                    {'name': 'community', 'description': 'Community Setting', 'sort_order': 2},
                    {'name': 'clinic', 'description': 'Clinic/Office', 'sort_order': 3},
                    {'name': 'online', 'description': 'Online/Telehealth', 'sort_order': 4},
                ]
            },
            'staff_ratios': {
                'display_name': 'Staff Ratios',
                'description': 'Staff to participant ratios',
                'points': [
                    {'name': '1_1', 'description': '1:1 (One-on-one)', 'sort_order': 1},
                    {'name': '1_2', 'description': '1:2 (One to two)', 'sort_order': 2},
                    {'name': '1_3', 'description': '1:3 (One to three)', 'sort_order': 3},
                    {'name': '1_4', 'description': '1:4 (One to four)', 'sort_order': 4},
                    {'name': 'group', 'description': 'Group Setting', 'sort_order': 5},
                ]
            }
        }
        
        for type_name, type_info in default_data.items():
            # Check if data type already exists
            existing_type = DynamicDataService.get_data_type_by_name(db, type_name)
            if existing_type:
                continue
            
            # Create data type
            data_type = DynamicDataService.create_data_type(
                db,
                DataTypeCreate(
                    name=type_name,
                    display_name=type_info['display_name'],
                    description=type_info['description'],
                    is_active=True
                )
            )
            
            # Create data points
            for point_info in type_info['points']:
                DynamicDataService.create_data_point(
                    db,
                    DataPointCreate(
                        data_type_id=str(data_type.id),
                        name=point_info['name'],
                        description=point_info['description'],
                        sort_order=point_info['sort_order'],
                        is_active=True
                    )
                )