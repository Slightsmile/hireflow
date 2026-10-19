import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CandidateBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str | None = None
    cv_text: str | None = None
    skills: str | None = None
    experience_summary: str | None = None


class CandidateCreate(CandidateBase):
    pass


class CandidateUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    phone: str | None = None
    cv_text: str | None = None
    skills: str | None = None
    experience_summary: str | None = None


class CandidateOut(CandidateBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cv_filename: str | None = None
    cv_file_path: str | None = None
    created_at: datetime
    updated_at: datetime


class CandidateListResponse(BaseModel):
    items: list[CandidateOut]
    total: int
    page: int
    page_size: int


class BatchUploadError(BaseModel):
    filename: str
    error: str


class CandidateBatchResult(BaseModel):
    created: list[CandidateOut]
    errors: list[BatchUploadError]
