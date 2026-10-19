import csv
import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.ai_settings import get_ai_settings
from app.models.candidate import Candidate
from app.models.job import EmploymentType, Job, JobStatus
from app.models.user import User
from app.schemas.job import (
    JobBatchResult,
    JobBatchRowError,
    JobCreate,
    JobListResponse,
    JobMatchItem,
    JobMatchRequest,
    JobMatchResponse,
    JobOut,
    JobUpdate,
)
from app.services.matching import score_candidate
from app.services.pagination import paginate_params

router = APIRouter()

MAX_BATCH_JOBS = 500
MAX_MATCH_CANDIDATES = 50
EMPLOYMENT_TYPES = {e.value for e in EmploymentType}
JOB_STATUSES = {s.value for s in JobStatus}
JOB_CSV_COLUMNS = [
    "title",
    "department",
    "description",
    "required_skills",
    "preferred_skills",
    "experience_level",
    "employment_type",
    "location",
    "status",
]


@router.get("", response_model=JobListResponse)
def list_jobs(
    search: str | None = Query(default=None),
    status_filter: JobStatus | None = Query(default=None, alias="status"),
    department: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Job)
    if search:
        query = query.filter(Job.title.ilike(f"%{search}%"))
    if status_filter:
        query = query.filter(Job.status == status_filter)
    if department:
        query = query.filter(Job.department.ilike(f"%{department}%"))

    total = query.with_entities(func.count(Job.id)).scalar() or 0
    offset, limit = paginate_params(page, page_size)
    items = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()

    return JobListResponse(
        items=[JobOut.model_validate(j) for j in items], total=total, page=page, page_size=page_size
    )


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(payload: JobCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = Job(**payload.model_dump(), created_by=current_user.id)
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobOut.model_validate(job)


@router.get("/batch/template")
def job_batch_template(current_user: User = Depends(get_current_user)):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(JOB_CSV_COLUMNS)
    writer.writerow(
        [
            "Backend Engineer",
            "Engineering",
            "Build and maintain REST APIs in Python.",
            "Python, FastAPI, PostgreSQL",
            "Docker, Kubernetes",
            "Mid-level",
            "full_time",
            "Remote",
            "published",
        ]
    )
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jobs-template.csv"},
    )


@router.post("/batch", response_model=JobBatchResult, status_code=status.HTTP_201_CREATED)
def batch_create_jobs(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw = file.file.read()
    if len(raw) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File exceeds the {settings.max_upload_mb} MB limit")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="The CSV file must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="The CSV file appears to be empty")
    reader.fieldnames = [(name or "").strip().lower() for name in reader.fieldnames]
    if "title" not in reader.fieldnames or "description" not in reader.fieldnames:
        raise HTTPException(status_code=400, detail="The CSV must include 'title' and 'description' columns")

    created: list[JobOut] = []
    errors: list[JobBatchRowError] = []

    for index, row in enumerate(reader, start=2):
        if len(created) + len(errors) >= MAX_BATCH_JOBS:
            errors.append(
                JobBatchRowError(row=index, error=f"Row limit of {MAX_BATCH_JOBS} reached; remaining rows skipped")
            )
            break

        title = (row.get("title") or "").strip()
        description = (row.get("description") or "").strip()
        if not title:
            errors.append(JobBatchRowError(row=index, error="Missing title"))
            continue
        if not description:
            errors.append(JobBatchRowError(row=index, error="Missing description"))
            continue

        employment_type = (row.get("employment_type") or "").strip().lower() or EmploymentType.FULL_TIME.value
        if employment_type not in EMPLOYMENT_TYPES:
            errors.append(JobBatchRowError(row=index, error=f"Invalid employment_type '{employment_type}'"))
            continue
        job_status = (row.get("status") or "").strip().lower() or JobStatus.DRAFT.value
        if job_status not in JOB_STATUSES:
            errors.append(JobBatchRowError(row=index, error=f"Invalid status '{job_status}'"))
            continue

        job = Job(
            title=title,
            department=(row.get("department") or "").strip() or None,
            description=description,
            required_skills=(row.get("required_skills") or "").strip(),
            preferred_skills=(row.get("preferred_skills") or "").strip() or None,
            experience_level=(row.get("experience_level") or "").strip() or None,
            employment_type=EmploymentType(employment_type),
            location=(row.get("location") or "").strip() or None,
            status=JobStatus(job_status),
            created_by=current_user.id,
        )
        db.add(job)
        try:
            db.commit()
            db.refresh(job)
            created.append(JobOut.model_validate(job))
        except IntegrityError:
            db.rollback()
            errors.append(JobBatchRowError(row=index, error="Could not create this job"))

    return JobBatchResult(created=created, errors=errors)


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobOut.model_validate(job)


@router.post("/{job_id}/matches", response_model=JobMatchResponse)
def job_top_matches(
    job_id: uuid.UUID,
    payload: JobMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    ai_config = get_ai_settings(db)

    query = db.query(Candidate)
    if payload.candidate_ids:
        query = query.filter(Candidate.id.in_(payload.candidate_ids))
    candidates = query.order_by(Candidate.created_at.desc()).limit(MAX_MATCH_CANDIDATES).all()

    scored: list[JobMatchItem] = []
    engines: set[str] = set()
    for candidate in candidates:
        result = score_candidate(
            cv_text=candidate.cv_text,
            job_description=job.description,
            required_skills=job.required_skills,
            preferred_skills=job.preferred_skills,
            job_title=job.title,
            ai_config=ai_config,
        )
        engines.add(result["engine"])
        scored.append(
            JobMatchItem(
                candidate_id=candidate.id,
                full_name=candidate.full_name,
                email=candidate.email,
                match_score=result["match_score"],
                matched_skills=result["matched_skills"],
                missing_skills=result["missing_skills"],
                explanation=result["explanation"],
                warning=result["warning"],
                engine=result["engine"],
            )
        )

    scored.sort(key=lambda item: item.match_score, reverse=True)
    return JobMatchResponse(
        engine="ai" if "ai" in engines else "tfidf",
        items=scored[: payload.limit],
        total_scored=len(scored),
    )


@router.patch("/{job_id}", response_model=JobOut)
def update_job(
    job_id: uuid.UUID,
    payload: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)
    return JobOut.model_validate(job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    db.delete(job)
    db.commit()
    return None
