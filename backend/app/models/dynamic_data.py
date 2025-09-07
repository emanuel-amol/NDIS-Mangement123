# backend/app/models/dynamic_data.py
from __future__ import annotations
import uuid
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class DataType(Base):
    """Categories of dynamic data (disabilities, genders, qualifications, etc.)"""
    __tablename__ = "data_types"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = sa.Column(sa.String(100), nullable=False, unique=True)
    display_name = sa.Column(sa.String(100), nullable=False)
    description = sa.Column(sa.Text)
    is_active = sa.Column(sa.Boolean, default=True, nullable=False)
    
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False)

class DataPoint(Base):
    """Individual data entries within each type"""
    __tablename__ = "data_points"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data_type_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey('data_types.id'), nullable=False)
    name = sa.Column(sa.String(255), nullable=False)
    description = sa.Column(sa.Text)
    sort_order = sa.Column(sa.Integer, default=0)
    is_active = sa.Column(sa.Boolean, default=True, nullable=False)
    
    # Optional extra data for specific use cases (renamed from metadata)
    extra_data = sa.Column(sa.JSON)
    
    created_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False)

    # Unique constraint to prevent duplicates within the same data type
    __table_args__ = (
        sa.UniqueConstraint('data_type_id', 'name', name='uix_data_type_name'),
    )