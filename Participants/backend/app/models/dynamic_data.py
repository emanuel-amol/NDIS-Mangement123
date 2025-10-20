# backend/app/models/dynamic_data.py
from sqlalchemy import Column, Integer, String, Boolean, JSON, Index, UniqueConstraint, DateTime, func
from app.core.database import Base

class DynamicData(Base):
    __tablename__ = "dynamic_data"

    id = Column(Integer, primary_key=True, index=True)
    # e.g., "contact_methods", "disabilities", "pricing_items"
    type = Column(String(100), nullable=False, index=True)
    # short stable key for the value (unique within a type)
    code = Column(String(100), nullable=False)
    # human-readable label for UI
    label = Column(String(255), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    # optional extra fields (e.g., {"rate": 72.35, "unit": "hour", "service_code": "SVC_001"})
    meta = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("type", "code", name="uq_dynamic_data_type_code"),
        Index("ix_dynamic_data_type_active", "type", "is_active"),
    )
