import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.session import Base
from app.db.types import GUID


class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    SHORTLISTED = "shortlisted"
    INTERVIEW = "interview"
    HIRED = "hired"
    REJECTED = "rejected"


TERMINAL_STATUSES = {ApplicationStatus.HIRED, ApplicationStatus.REJECTED}


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (UniqueConstraint("candidate_id", "job_id", name="uq_candidate_job"),)

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("candidates.id"), nullable=False)
    job_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("jobs.id"), nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        Enum(
            ApplicationStatus,
            name="application_status",
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
        default=ApplicationStatus.APPLIED,
    )
    match_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    match_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    recruiter_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    candidate = relationship("Candidate", back_populates="applications")
    job = relationship("Job", back_populates="applications")
