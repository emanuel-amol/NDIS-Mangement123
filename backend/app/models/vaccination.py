# app/models/vaccination.py
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
    __tablename__ = "vaccination_records"

    # --- Keys ---
    id = Column(Integer, primary_key=True, index=True)

    participant_id = Column(
        Integer,
        ForeignKey("participants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # --- Business fields ---
    vaccine_name = Column(String(200), nullable=False)   # e.g., "COVID-19", "Influenza"
    brand = Column(String(200), nullable=True)           # e.g., "Pfizer", "Moderna"
    dose_number = Column(String(50), nullable=True)      # e.g., "1", "2", "booster"
    date_administered = Column(Date, nullable=False)
    lot_number = Column(String(100), nullable=True)
    provider = Column(String(200), nullable=True)        # clinic / GP / pharmacy
    notes = Column(Text, nullable=True)

    # --- Audit fields ---
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # --- Relationship back to Participant ---
    participant = relationship(
        "Participant",
        back_populates="vaccinations",
        lazy="joined",
    )

    # --- Table-level constraints & indexes ---
    __table_args__ = (
        # Helps prevent duplicate entries for the same participant + vaccine + dose + date
        UniqueConstraint(
            "participant_id", "vaccine_name", "dose_number", "date_administered",
            name="uq_vax_participant_vaccine_dose_date",
        ),
        # Useful lookups
        Index("ix_vax_participant_date", "participant_id", "date_administered"),
        Index("ix_vax_participant_vaccine", "participant_id", "vaccine_name"),
    )

    # --- Helpers ---
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
