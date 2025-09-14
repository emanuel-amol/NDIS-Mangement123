from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, text
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime

class TemplateData(Base):
    __tablename__ = "template_data"

    id = Column(Integer, primary_key=True, index=True)
    template_key = Column(String(100), nullable=False, index=True)  # e.g. service_agreement
    participant_id = Column(Integer, ForeignKey("participants.id"), nullable=True, index=True)
    status = Column(String(50), nullable=False, default="draft", index=True)
    data = Column(JSON, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))

    participant = relationship("Participant", lazy="joined")
