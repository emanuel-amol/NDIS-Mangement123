from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    ForeignKey,
    Date,
    Float,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TimestampMixin:
    """Reusable created/updated timestamp columns."""

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Home(Base, TimestampMixin):
    __tablename__ = "homes"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, nullable=False)
    state = Column(String, nullable=False)
    postal_code = Column(String, nullable=False)
    property_type = Column(String, nullable=False)
    sda_type = Column(String)
    status = Column(String, default="Available")
    description = Column(Text)

    profile = relationship(
        "HomeProfile",
        back_populates="home",
        uselist=False,
        cascade="all, delete-orphan",
    )
    property_detail = relationship(
        "HomePropertyDetail",
        back_populates="home",
        uselist=False,
        cascade="all, delete-orphan",
    )
    shared_spaces = relationship(
        "HomeSharedSpace",
        back_populates="home",
        cascade="all, delete-orphan",
    )
    features = relationship(
        "HomeFeature",
        back_populates="home",
        cascade="all, delete-orphan",
    )
    rooms = relationship(
        "Room",
        back_populates="home",
        cascade="all, delete-orphan",
    )
    notes = relationship(
        "HomeNote",
        back_populates="home",
        cascade="all, delete-orphan",
    )
    maintenance_requests = relationship(
        "MaintenanceRequest",
        back_populates="home",
        cascade="all, delete-orphan",
    )


class HomeProfile(Base, TimestampMixin):
    __tablename__ = "home_profiles"
    __table_args__ = (UniqueConstraint("home_id", name="uq_home_profiles_home_id"),)

    id = Column(Integer, primary_key=True)
    home_id = Column(Integer, ForeignKey("homes.id"), nullable=False)
    display_name = Column(String, nullable=False)
    assigned_manager = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)

    home = relationship("Home", back_populates="profile")


class HomePropertyDetail(Base, TimestampMixin):
    __tablename__ = "home_property_details"
    __table_args__ = (UniqueConstraint("home_id", name="uq_home_property_details_home_id"),)

    id = Column(Integer, primary_key=True)
    home_id = Column(Integer, ForeignKey("homes.id"), nullable=False)
    total_rooms = Column(Integer, default=0)
    bathrooms = Column(Integer, default=0)
    kitchens = Column(Integer, default=0)
    parking_spaces = Column(Integer, default=0)

    home = relationship("Home", back_populates="property_detail")


class HomeSharedSpace(Base, TimestampMixin):
    __tablename__ = "home_shared_spaces"

    id = Column(Integer, primary_key=True)
    home_id = Column(Integer, ForeignKey("homes.id"), nullable=False)
    name = Column(String, nullable=False)

    home = relationship("Home", back_populates="shared_spaces")


class HomeFeature(Base, TimestampMixin):
    __tablename__ = "home_features"
    __table_args__ = (
        UniqueConstraint("home_id", "feature_name", name="uq_home_features_home_feature"),
    )

    id = Column(Integer, primary_key=True)
    home_id = Column(Integer, ForeignKey("homes.id"), nullable=False)
    feature_name = Column(String, nullable=False)
    is_available = Column(Boolean, default=False, nullable=False)

    home = relationship("Home", back_populates="features")


class Room(Base, TimestampMixin):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    home_id = Column(Integer, ForeignKey("homes.id"))
    bed_type = Column(String)
    rent_amount = Column(Float)
    rent_frequency = Column(String)
    ensuite = Column(Boolean, default=False)
    furnishings = Column(Text)
    occupancy_status = Column(String, default="Vacant")

    home = relationship("Home", back_populates="rooms")
    detail = relationship(
        "RoomDetail",
        back_populates="room",
        uselist=False,
        cascade="all, delete-orphan",
    )
    images = relationship(
        "RoomImage",
        back_populates="room",
        cascade="all, delete-orphan",
    )
    occupancies = relationship(
        "Occupancy",
        back_populates="room",
        cascade="all, delete-orphan",
    )


class RoomDetail(Base, TimestampMixin):
    __tablename__ = "room_details"
    __table_args__ = (UniqueConstraint("room_id", name="uq_room_details_room_id"),)

    id = Column(Integer, primary_key=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    name = Column(String, nullable=False)
    bed_height = Column(String)
    sofas = Column(Integer, default=0)
    cupboard = Column(Boolean, default=False)
    tv = Column(Boolean, default=False)
    tables = Column(Integer, default=0)
    door_width = Column(String)
    description = Column(Text)

    room = relationship("Room", back_populates="detail")


class RoomImage(Base, TimestampMixin):
    __tablename__ = "room_images"

    id = Column(Integer, primary_key=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    file_name = Column(String, nullable=False)
    object_key = Column(String, nullable=False)
    content_type = Column(String)
    file_size = Column(Integer)
    url = Column(Text)

    room = relationship("Room", back_populates="images")


class Occupancy(Base, TimestampMixin):
    __tablename__ = "occupancies"

    id = Column(Integer, primary_key=True, index=True)
    participant_id = Column(Integer)
    room_id = Column(Integer, ForeignKey("rooms.id"))
    move_in_date = Column(Date)
    move_out_date = Column(Date, nullable=True)

    room = relationship("Room", back_populates="occupancies")


class MaintenanceRequest(Base, TimestampMixin):
    __tablename__ = "maintenance_requests"

    id = Column(Integer, primary_key=True, index=True)
    home_id = Column(Integer, ForeignKey("homes.id"))
    description = Column(Text, nullable=False)
    status = Column(String, default="Open")
    priority = Column(String, default="Medium")
    category = Column(String)
    assigned_to = Column(String)
    scheduled_date = Column(Date)
    completed_date = Column(Date)
    cost = Column(Float)
    notes = Column(Text)

    home = relationship("Home", back_populates="maintenance_requests")
    attachments = relationship(
        "MaintenanceAttachment",
        back_populates="maintenance_request",
        cascade="all, delete-orphan",
    )


class MaintenanceAttachment(Base, TimestampMixin):
    __tablename__ = "maintenance_attachments"

    id = Column(Integer, primary_key=True)
    maintenance_request_id = Column(
        Integer,
        ForeignKey("maintenance_requests.id"),
        nullable=False,
    )
    file_name = Column(String, nullable=False)
    object_key = Column(String, nullable=False)
    content_type = Column(String)
    file_size = Column(Integer)
    url = Column(Text)

    maintenance_request = relationship(
        "MaintenanceRequest",
        back_populates="attachments",
    )


class MaintenanceAudit(Base, TimestampMixin):
    __tablename__ = "maintenance_audits"

    id = Column(Integer, primary_key=True)
    maintenance_request_id = Column(Integer, ForeignKey("maintenance_requests.id"), nullable=False)
    action = Column(String, nullable=False)  # Created, Updated, StatusChanged, AttachmentAdded
    changed_by = Column(String)  # Optional username or system
    from_status = Column(String)
    to_status = Column(String)
    comment = Column(Text)

    maintenance_request = relationship("MaintenanceRequest")


class PreventiveSchedule(Base, TimestampMixin):
    __tablename__ = "preventive_schedules"

    id = Column(Integer, primary_key=True)
    home_id = Column(Integer, ForeignKey("homes.id"), nullable=False)
    description = Column(Text, nullable=False)
    frequency = Column(String, nullable=False)  # Monthly, Quarterly, SemiAnnual, Annual, CustomDays
    interval_days = Column(Integer)  # Used when frequency == CustomDays
    assigned_to = Column(String)
    category = Column(String)
    estimated_cost = Column(Float)
    next_due_date = Column(Date, nullable=False)
    active = Column(Boolean, default=True, nullable=False)

    home = relationship("Home")


class HomeNote(Base, TimestampMixin):
    __tablename__ = "home_notes"

    id = Column(Integer, primary_key=True, index=True)
    home_id = Column(Integer, ForeignKey("homes.id"))
    note = Column(Text, nullable=False)
    created_by = Column(String)

    home = relationship("Home", back_populates="notes")
    attachments = relationship(
        "HomeNoteAttachment",
        back_populates="note",
        cascade="all, delete-orphan",
    )


class HomeNoteAttachment(Base, TimestampMixin):
    __tablename__ = "home_note_attachments"

    id = Column(Integer, primary_key=True)
    note_id = Column(Integer, ForeignKey("home_notes.id"), nullable=False)
    file_name = Column(String, nullable=False)
    object_key = Column(String, nullable=False)
    content_type = Column(String)
    file_size = Column(Integer)
    url = Column(Text)

    note = relationship("HomeNote", back_populates="attachments")
