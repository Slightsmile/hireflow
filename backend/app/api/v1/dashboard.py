from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.application import Application, ApplicationStatus
from app.models.candidate import Candidate
from app.models.job import Job, JobStatus
from app.models.user import User
from app.schemas.application import ApplicationOut
from app.schemas.dashboard import DashboardStats, RecentApplicationsResponse

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_jobs = db.query(func.count(Job.id)).scalar() or 0
    open_jobs = db.query(func.count(Job.id)).filter(Job.status == JobStatus.PUBLISHED).scalar() or 0
    total_candidates = db.query(func.count(Candidate.id)).scalar() or 0
    total_applications = db.query(func.count(Application.id)).scalar() or 0
    awaiting_review = (
        db.query(func.count(Application.id)).filter(Application.status == ApplicationStatus.APPLIED).scalar() or 0
    )

    status_rows = db.query(Application.status, func.count(Application.id)).group_by(Application.status).all()
    status_counts = {status.value: count for status, count in status_rows}
    for status_enum in ApplicationStatus:
        status_counts.setdefault(status_enum.value, 0)

    return DashboardStats(
        total_jobs=total_jobs,
        open_jobs=open_jobs,
        total_candidates=total_candidates,
        total_applications=total_applications,
        applications_awaiting_review=awaiting_review,
        status_counts=status_counts,
    )


@router.get("/recent-applications", response_model=RecentApplicationsResponse)
def recent_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    items = db.query(Application).order_by(Application.applied_at.desc()).limit(10).all()
    return RecentApplicationsResponse(items=[ApplicationOut.model_validate(a) for a in items])
