from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, DateTime, ForeignKey, Identity, Text
from sqlalchemy.sql import func
from .database import Base

class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True, index=True)
    first_name: Mapped[str]
    last_name: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True, index=True)
    mobile: Mapped[str | None]
    job_title: Mapped[str | None]
    address: Mapped[str | None]

    status: Mapped[str] = mapped_column(default="Applied")
    applied_on: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    user: Mapped["User"] = relationship(back_populates="candidates")
    profile: Mapped["CandidateProfile"] = relationship(back_populates="candidate", uselist=False, cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True, index=True)
    username: Mapped[str] = mapped_column(unique=True, index=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    hashed_password: Mapped[str]
    # Simple role field for RBAC: "user" or "admin"
    role: Mapped[str] = mapped_column(String, default="user")

    candidates: Mapped[list["Candidate"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), unique=True)

    summary: Mapped[str | None]
    skills: Mapped[str | None]
    linkedin: Mapped[str | None]
    address: Mapped[str | None]
    resume_path: Mapped[str | None]
    photo_path: Mapped[str | None]
    # JSON-as-text bag for additional fields we want to persist without schema churn
    extras: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    candidate: Mapped["Candidate"] = relationship(back_populates="profile")
