from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base

class Referral(Base):
    __tablename__ = "referrals"

    id = Column(Integer, primary_key=True, index=True)
    
    # Client Details
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(String(10), nullable=False)  # YYYY-MM-DD format
    phone_number = Column(String(20), nullable=False)
    email_address = Column(String(255), nullable=True)
    street_address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(10), nullable=False)
    postcode = Column(String(10), nullable=False)
    
    # Representative Details (Optional)
    rep_first_name = Column(String(100), nullable=True)
    rep_last_name = Column(String(100), nullable=True)
    rep_phone_number = Column(String(20), nullable=True)
    rep_email_address = Column(String(255), nullable=True)
    rep_relationship = Column(String(50), nullable=True)
    
    # System Fields
    status = Column(String(20), default="new")  # new, reviewed, contacted, processed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    notes = Column(Text, nullable=True)  # Admin notes