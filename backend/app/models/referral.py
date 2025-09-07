# backend/app/models/referral.py
from __future__ import annotations
import uuid
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Referral(Base):
    __tablename__ = "referrals"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Required fields
    first_name       = sa.Column(sa.String(100), nullable=False)
    last_name        = sa.Column(sa.String(100), nullable=False)
    date_of_birth    = sa.Column(sa.Date,        nullable=False)
    phone_number     = sa.Column(sa.String(40),  nullable=False)
    email_address    = sa.Column(sa.String(255), nullable=False)
    street_address   = sa.Column(sa.String(255), nullable=False)
    city             = sa.Column(sa.String(100), nullable=False)
    state            = sa.Column(sa.String(100), nullable=False)
    postcode         = sa.Column(sa.String(20),  nullable=False)

    # Optional representative fields
    rep_first_name   = sa.Column(sa.String(100))
    rep_last_name    = sa.Column(sa.String(100))
    rep_phone_number = sa.Column(sa.String(40))
    rep_email_address= sa.Column(sa.String(255))
    rep_relationship = sa.Column(sa.String(100))

    # Status + metadata
    status           = sa.Column(sa.String(32), nullable=False, default="NEW")
    notes            = sa.Column(sa.Text)

    created_at       = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at       = sa.Column(sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False)
