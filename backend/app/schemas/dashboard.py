from pydantic import BaseModel

from app.schemas.application import ApplicationOut


class DashboardStats(BaseModel):
    total_jobs: int
    open_jobs: int
    total_candidates: int
    total_applications: int
    applications_awaiting_review: int
    status_counts: dict[str, int]


class RecentApplicationsResponse(BaseModel):
    items: list[ApplicationOut]
