# backend/app/models/provider_models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Time, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class AppointmentStatus(enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class NotificationType(enum.Enum):
    NEW_REFERRAL = "new_referral"
    REFERRAL_UPDATE = "referral_update"
    APPOINTMENT_REMINDER = "appointment_reminder"
    SYSTEM_MESSAGE = "system_message"
    PERFORMANCE_ALERT = "performance_alert"

class Priority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class ProviderAvailability(Base):
    """Provider availability schedule"""
    __tablename__ = "provider_availability"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0-6 (Monday-Sunday)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_available = Column(Boolean, default=True)
    max_appointments = Column(Integer, default=8)
    location = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    provider = relationship("User", back_populates="availability_slots")

class Appointment(Base):
    """Provider appointments with participants"""
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    participant_id = Column(Integer, nullable=False)  # From referral
    
    # Appointment Details
    appointment_date = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=60)
    status = Column(String(20), nullable=False, default="scheduled")
    service_type = Column(String(100), nullable=False)
    location = Column(String(255), nullable=True)
    
    # Notes and Details
    appointment_notes = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    no_show_notes = Column(Text, nullable=True)
    
    # Billing Information
    session_fee = Column(Float, nullable=True)
    is_bulk_billed = Column(Boolean, default=False)
    invoice_sent = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    referral = relationship("Referral", back_populates="appointments")
    provider = relationship("User", back_populates="appointments")
    session_notes = relationship("SessionNote", back_populates="appointment")

class SessionNote(Base):
    """Session notes and progress tracking"""
    __tablename__ = "session_notes"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=False)
    referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Session Details
    session_date = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    session_type = Column(String(100), nullable=True)  # assessment, treatment, review
    
    # Goals and Progress
    goals_addressed = Column(JSON, nullable=True)  # List of goals worked on
    interventions_used = Column(JSON, nullable=True)  # List of interventions
    participant_response = Column(Text, nullable=False)
    progress_notes = Column(Text, nullable=False)
    objective_measures = Column(JSON, nullable=True)  # Quantitative measures
    
    # Homework and Follow-up
    homework_assigned = Column(Text, nullable=True)
    next_session_focus = Column(Text, nullable=True)
    referrals_made = Column(Text, nullable=True)  # Other service referrals
    
    # Ratings and Assessments
    session_rating = Column(Integer, nullable=True)  # 1-5 scale
    participation_level = Column(String(20), nullable=True)  # low, medium, high
    goal_progress_rating = Column(Integer, nullable=True)  # 1-10 scale
    
    # Risk and Safety
    safety_concerns = Column(Text, nullable=True)
    risk_level = Column(String(20), default="low")  # low, medium, high
    incident_occurred = Column(Boolean, default=False)
    incident_details = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    appointment = relationship("Appointment", back_populates="session_notes")
    referral = relationship("Referral", back_populates="session_notes")
    provider = relationship("User", back_populates="session_notes")

class ProviderNotification(Base):
    """Provider notifications and alerts"""
    __tablename__ = "provider_notifications"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Notification Details
    type = Column(String(50), nullable=False)  # NotificationType enum
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default="medium")  # Priority enum
    
    # Status and Interaction
    is_read = Column(Boolean, default=False)
    is_acknowledged = Column(Boolean, default=False)
    action_required = Column(Boolean, default=False)
    action_taken = Column(Boolean, default=False)
    
    # Related Objects
    related_referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=True)
    related_appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    related_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Metadata
    metadata = Column(JSON, nullable=True)  # Additional data
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    provider = relationship("User", back_populates="notifications")
    related_referral = relationship("Referral", foreign_keys=[related_referral_id])
    related_appointment = relationship("Appointment", foreign_keys=[related_appointment_id])

class ProviderPerformanceMetric(Base):
    """Provider performance metrics and KPIs"""
    __tablename__ = "provider_performance_metrics"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Time Period
    metric_date = Column(DateTime(timezone=True), nullable=False)
    period_type = Column(String(20), nullable=False)  # daily, weekly, monthly, yearly
    
    # Referral Metrics
    total_referrals_received = Column(Integer, default=0)
    referrals_accepted = Column(Integer, default=0)
    referrals_completed = Column(Integer, default=0)
    referrals_declined = Column(Integer, default=0)
    average_response_time_hours = Column(Float, nullable=True)
    average_completion_time_days = Column(Float, nullable=True)
    
    # Appointment Metrics
    total_appointments_scheduled = Column(Integer, default=0)
    appointments_completed = Column(Integer, default=0)
    appointments_cancelled = Column(Integer, default=0)
    no_shows = Column(Integer, default=0)
    cancellation_rate = Column(Float, default=0.0)
    no_show_rate = Column(Float, default=0.0)
    
    # Quality Metrics
    participant_satisfaction_avg = Column(Float, nullable=True)
    goal_achievement_rate = Column(Float, nullable=True)
    session_notes_completion_rate = Column(Float, default=1.0)
    
    # Financial Metrics
    total_sessions_billed = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    average_session_fee = Column(Float, nullable=True)
    
    # Compliance Metrics
    documentation_compliance_rate = Column(Float, default=1.0)
    appointment_punctuality_rate = Column(Float, default=1.0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    provider = relationship("User", back_populates="performance_metrics")

class ProviderDocument(Base):
    """Provider-related documents and files"""
    __tablename__ = "provider_documents"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    
    # Document Details
    document_type = Column(String(100), nullable=False)  # assessment, treatment_plan, progress_report, etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # File Information
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)
    mime_type = Column(String(100), nullable=False)
    
    # Access Control
    is_confidential = Column(Boolean, default=True)
    is_shared_with_participant = Column(Boolean, default=False)
    is_shared_with_admin = Column(Boolean, default=True)
    
    # Metadata
    tags = Column(JSON, nullable=True)  # Search tags
    metadata = Column(JSON, nullable=True)  # Additional metadata
    
    # Version Control
    version = Column(String(20), default="1.0")
    is_current_version = Column(Boolean, default=True)
    parent_document_id = Column(Integer, ForeignKey("provider_documents.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    provider = relationship("User", back_populates="documents")
    referral = relationship("Referral", foreign_keys=[referral_id])
    appointment = relationship("Appointment", foreign_keys=[appointment_id])
    parent_document = relationship("ProviderDocument", remote_side=[id])

# Update User model relationships (add to existing User model)
"""
Add these relationships to the existing User model in app/models/user.py:

# Provider-specific relationships
availability_slots = relationship("ProviderAvailability", back_populates="provider")
appointments = relationship("Appointment", back_populates="provider")
session_notes = relationship("SessionNote", back_populates="provider")
notifications = relationship("ProviderNotification", back_populates="provider")
performance_metrics = relationship("ProviderPerformanceMetric", back_populates="provider")
documents = relationship("ProviderDocument", back_populates="provider")
"""

# Update Referral model relationships (add to existing Referral model)
"""
Add these relationships to the existing Referral model in app/models/referral.py:

# Provider-specific relationships
appointments = relationship("Appointment", back_populates="referral")
session_notes = relationship("SessionNote", back_populates="referral")

# Add these fields to Referral model:
assigned_provider_id = Column(Integer, ForeignKey("users.id"), nullable=True)
accepted_at = Column(DateTime(timezone=True), nullable=True)
priority = Column(String(20), default="medium")  # Priority enum

# Add relationship
assigned_provider = relationship("User", foreign_keys=[assigned_provider_id])
"""