# backend/app/models/vaccination.py - COMPLETE VACCINATION RECORD MODEL
from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    Text,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class VaccinationRecord(Base):
    """
    Vaccination records for NDIS participants.
    
    Tracks all immunizations received, including:
    - Standard vaccines (flu, COVID-19, pneumococcal, etc.)
    - Dose tracking (primary series, boosters)
    - Provider and location information
    - Lot numbers for traceability
    """
    __tablename__ = "vaccination_records"

    # ===== PRIMARY KEY =====
    id = Column(Integer, primary_key=True, index=True)

    # ===== FOREIGN KEYS =====
    participant_id = Column(
        Integer,
        ForeignKey("participants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ===== VACCINATION DETAILS =====
    vaccine_name = Column(String(200), nullable=False)   # e.g., "COVID-19", "Influenza", "Pneumococcal"
    brand = Column(String(200), nullable=True)           # e.g., "Pfizer", "Moderna", "AstraZeneca"
    dose_number = Column(String(50), nullable=True)      # e.g., "1", "2", "booster", "annual"
    date_administered = Column(Date, nullable=False)
    lot_number = Column(String(100), nullable=True)      # Batch/lot number for traceability
    provider = Column(String(200), nullable=True)        # clinic / GP / pharmacy name
    notes = Column(Text, nullable=True)                  # any adverse reactions, special notes
    
    # ===== AUDIT FIELDS =====
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, 
        server_default=func.now(), 
        onupdate=func.now(), 
        nullable=False
    )

    # ===== RELATIONSHIP BACK TO PARTICIPANT =====
    participant = relationship(
        "Participant",
        back_populates="vaccinations",
        lazy="joined",
    )

    # ===== TABLE-LEVEL CONSTRAINTS & INDEXES =====
    __table_args__ = (
        # Prevents duplicate entries for same participant + vaccine + dose + date
        UniqueConstraint(
            "participant_id", 
            "vaccine_name", 
            "dose_number", 
            "date_administered",
            name="uq_vax_participant_vaccine_dose_date",
        ),
        # Useful lookups for queries
        Index("ix_vax_participant_date", "participant_id", "date_administered"),
        Index("ix_vax_participant_vaccine", "participant_id", "vaccine_name"),
        Index("ix_vax_date_administered", "date_administered"),
    )

    # ===== METHODS =====
    
    def __repr__(self) -> str:
        return (
            f"<VaccinationRecord(id={self.id}, participant_id={self.participant_id}, "
            f"vaccine_name='{self.vaccine_name}', dose='{self.dose_number}', "
            f"date={self.date_administered})>"
        )

    @property
    def display_name(self) -> str:
        """Nice, compact label for UI lists."""
        dose = f" (dose {self.dose_number})" if self.dose_number else ""
        brand = f" - {self.brand}" if self.brand else ""
        return f"{self.vaccine_name}{dose}{brand}"
    
    @property
    def is_recent(self) -> bool:
        """Check if vaccination was within the last 12 months."""
        from datetime import date, timedelta
        one_year_ago = date.today() - timedelta(days=365)
        return self.date_administered >= one_year_ago