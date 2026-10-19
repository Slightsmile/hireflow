import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.candidate import Candidate
from app.models.user import User
from app.schemas.candidate import (
    BatchUploadError,
    CandidateBatchResult,
    CandidateCreate,
    CandidateListResponse,
    CandidateOut,
    CandidateUpdate,
)
from app.services.pdf import extract_pdf_text, guess_candidate_fields
from app.services.pagination import paginate_params
from app.services.storage import resolve_cv_path, save_cv_file

router = APIRouter()

MAX_BATCH_FILES = 25


def _read_upload(file: UploadFile) -> bytes:
    data = file.file.read()
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise ValueError(f"File exceeds the {settings.max_upload_mb} MB limit")
    return data


def _validate_pdf(file: UploadFile, data: bytes) -> None:
    if not (file.filename or "").lower().endswith(".pdf"):
        raise ValueError("Only PDF files are supported")
    if not data.startswith(b"%PDF"):
        raise ValueError("The uploaded file is not a valid PDF")


@router.get("", response_model=CandidateListResponse)
def list_candidates(
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Candidate)
    if search:
        query = query.filter(
            or_(Candidate.full_name.ilike(f"%{search}%"), Candidate.email.ilike(f"%{search}%"))
        )

    total = query.with_entities(func.count(Candidate.id)).scalar() or 0
    offset, limit = paginate_params(page, page_size)
    items = query.order_by(Candidate.created_at.desc()).offset(offset).limit(limit).all()

    return CandidateListResponse(
        items=[CandidateOut.model_validate(c) for c in items], total=total, page=page, page_size=page_size
    )


@router.post("", response_model=CandidateOut, status_code=status.HTTP_201_CREATED)
def create_candidate(
    payload: CandidateCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    candidate = Candidate(**payload.model_dump())
    db.add(candidate)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A candidate with this email already exists")
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


@router.post("/batch", response_model=CandidateBatchResult, status_code=status.HTTP_201_CREATED)
def batch_upload_candidates(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files were uploaded")
    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Upload at most {MAX_BATCH_FILES} files at a time",
        )

    created: list[CandidateOut] = []
    errors: list[BatchUploadError] = []
    seen_emails: set[str] = set()

    for file in files:
        name = file.filename or "cv.pdf"
        try:
            data = _read_upload(file)
            _validate_pdf(file, data)
            text = extract_pdf_text(data)
            fields = guess_candidate_fields(text, name)

            email = fields["email"]
            if email:
                if email.lower() in seen_emails or db.query(Candidate).filter(Candidate.email == email).first():
                    raise ValueError(f"A candidate with email {email} already exists")
            else:
                email = f"unknown+{uuid.uuid4().hex[:8]}@cv-upload.local"

            candidate_id = uuid.uuid4()
            safe_name, stored_path = save_cv_file(data, candidate_id, name)
            candidate = Candidate(
                id=candidate_id,
                full_name=fields["full_name"],
                email=email,
                phone=fields["phone"],
                cv_text=text,
                cv_filename=safe_name,
                cv_file_path=stored_path,
            )
            db.add(candidate)
            db.commit()
            db.refresh(candidate)

            seen_emails.add(email.lower())
            created.append(CandidateOut.model_validate(candidate))
        except ValueError as exc:
            db.rollback()
            errors.append(BatchUploadError(filename=name, error=str(exc)))
        except IntegrityError:
            db.rollback()
            errors.append(BatchUploadError(filename=name, error="A candidate with this email already exists"))

    return CandidateBatchResult(created=created, errors=errors)


@router.get("/{candidate_id}", response_model=CandidateOut)
def get_candidate(
    candidate_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return CandidateOut.model_validate(candidate)


@router.post("/{candidate_id}/cv", response_model=CandidateOut)
def upload_candidate_cv(
    candidate_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    try:
        data = _read_upload(file)
        _validate_pdf(file, data)
        text = extract_pdf_text(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    safe_name, stored_path = save_cv_file(data, candidate.id, file.filename or "cv.pdf")
    candidate.cv_text = text
    candidate.cv_filename = safe_name
    candidate.cv_file_path = stored_path
    db.commit()
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


@router.get("/{candidate_id}/cv")
def download_candidate_cv(
    candidate_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    if not candidate.cv_file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No CV file on record for this candidate")

    path = resolve_cv_path(candidate.cv_file_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The stored CV file could not be found")

    return FileResponse(path, media_type="application/pdf", filename=candidate.cv_filename or "cv.pdf")


@router.patch("/{candidate_id}", response_model=CandidateOut)
def update_candidate(
    candidate_id: uuid.UUID,
    payload: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(candidate, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A candidate with this email already exists")
    db.refresh(candidate)
    return CandidateOut.model_validate(candidate)


@router.delete("/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate(
    candidate_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    db.delete(candidate)
    db.commit()
    return None
