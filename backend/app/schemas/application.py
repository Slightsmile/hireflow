import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.application import ApplicationStatus
from app.schemas.candidate import CandidateOut
from app.schemas.job import JobOut


class ApplicationCreate(BaseModel):
    candidate_id: uuid.UUID
    job_id: uuid.UUID
    recruiter_notes: str | None = None


class ApplicationUpdate(BaseModel):
    recruiter_notes: str | None = None
    status: ApplicationStatus | None = None


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    candidate_id: uuid.UUID
    job_id: uuid.UUID
    status: ApplicationStatus
    match_score: int | None
    match_explanation: str | None
    recruiter_notes: str | None
    applied_at: datetime
    updated_at: datetime


class ApplicationDetailOut(ApplicationOut):
    candidate: CandidateOut
    job: JobOut


class ApplicationListResponse(BaseModel):
    items: list[ApplicationOut]
    total: int
    page: int
    page_size: int


class MatchResult(BaseModel):
    match_score: int
    matched_skills: list[str]
    missing_skills: list[str]
    explanation: str
    warning: str | None = None
    is_saved: bool = False
