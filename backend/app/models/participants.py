from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Participant(Base):
    __tablename__ = "participants"   # <- make sure this matches your DB table name

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    ndis_number = Column(String(64), nullable=True, index=True)
    address = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(64), nullable=True)
