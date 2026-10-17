import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.application import TERMINAL_STATUSES, Application, ApplicationStatus
from app.models.candidate import Candidate
from app.models.job import Job, JobStatus
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationDetailOut,
    ApplicationListResponse,
    ApplicationOut,
    ApplicationStatusUpdate,
    ApplicationUpdate,
    MatchResult,
)
from app.services.matching import match_cv_to_job
from app.services.pagination import paginate_params

router = APIRouter()


@router.get("", response_model=ApplicationListResponse)
def list_applications(
    job_id: uuid.UUID | None = Query(default=None),
    status_filter: ApplicationStatus | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Application)
    if job_id:
        query = query.filter(Application.job_id == job_id)
    if status_filter:
        query = query.filter(Application.status == status_filter)

    total = query.with_entities(func.count(Application.id)).scalar() or 0
    offset, limit = paginate_params(page, page_size)
    items = query.order_by(Application.applied_at.desc()).offset(offset).limit(limit).all()

    return ApplicationListResponse(
        items=[ApplicationOut.model_validate(a) for a in items], total=total, page=page, page_size=page_size
    )


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    candidate = db.get(Candidate, payload.candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    job = db.get(Job, payload.job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.status == JobStatus.CLOSED or job.status == JobStatus.ARCHIVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This job is not accepting applications")

    application = Application(
        candidate_id=payload.candidate_id, job_id=payload.job_id, recruiter_notes=payload.recruiter_notes
    )
    db.add(application)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="This candidate has already applied to this job"
        )
    db.refresh(application)
    return ApplicationOut.model_validate(application)


@router.get("/{application_id}", response_model=ApplicationDetailOut)
def get_application(
    application_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    application = (
        db.query(Application)
        .options(joinedload(Application.candidate), joinedload(Application.job))
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return ApplicationDetailOut.model_validate(application)


@router.patch("/{application_id}", response_model=ApplicationOut)
def update_application(
    application_id: uuid.UUID,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = db.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates:
        _validate_status_transition(application.status, updates["status"])
    for field, value in updates.items():
        setattr(application, field, value)

    db.commit()
    db.refresh(application)
    return ApplicationOut.model_validate(application)


@router.patch("/{application_id}/status", response_model=ApplicationOut)
def update_application_status(
    application_id: uuid.UUID,
    payload: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    application = db.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    _validate_status_transition(application.status, payload.status)
    application.status = payload.status
    db.commit()
    db.refresh(application)
    return ApplicationOut.model_validate(application)


def _validate_status_transition(current: ApplicationStatus, new: ApplicationStatus) -> None:
    if current in TERMINAL_STATUSES and new != current:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application is already '{current.value}' and cannot be changed further",
        )


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    application = db.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    db.delete(application)
    db.commit()
    return None


@router.post("/{application_id}/match", response_model=MatchResult)
def run_match(
    application_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    application = (
        db.query(Application)
        .options(joinedload(Application.candidate), joinedload(Application.job))
        .filter(Application.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    result = match_cv_to_job(
        cv_text=application.candidate.cv_text,
        job_description=application.job.description,
        required_skills=application.job.required_skills,
        preferred_skills=application.job.preferred_skills,
    )

    application.match_score = result["match_score"]
    application.match_explanation = result["explanation"]
    db.commit()

    return MatchResult(
        match_score=result["match_score"],
        matched_skills=result["matched_skills"],
        missing_skills=result["missing_skills"],
        explanation=result["explanation"],
        warning=result["warning"],
        is_saved=True,
    )


@router.get("/{application_id}/match", response_model=MatchResult)
def get_saved_match(
    application_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    application = db.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if application.match_score is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No saved match result for this application")

    return MatchResult(
        match_score=application.match_score,
        matched_skills=[],
        missing_skills=[],
        explanation=application.match_explanation or "",
        warning=None,
        is_saved=True,
    )
