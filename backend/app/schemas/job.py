import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.job import EmploymentType, JobStatus


class JobBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    department: str | None = None
    description: str = Field(min_length=1)
    required_skills: str = ""
    preferred_skills: str | None = None
    experience_level: str | None = None
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    location: str | None = None


class JobCreate(JobBase):
    status: JobStatus = JobStatus.DRAFT


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    department: str | None = None
    description: str | None = Field(default=None, min_length=1)
    required_skills: str | None = None
    preferred_skills: str | None = None
    experience_level: str | None = None
    employment_type: EmploymentType | None = None
    location: str | None = None
    status: JobStatus | None = None


class JobOut(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: JobStatus
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime


class JobListResponse(BaseModel):
    items: list[JobOut]
    total: int
    page: int
    page_size: int
