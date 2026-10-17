import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.candidate import Candidate
from app.models.user import User
from app.schemas.candidate import CandidateCreate, CandidateListResponse, CandidateOut, CandidateUpdate
from app.services.pagination import paginate_params

router = APIRouter()


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


@router.get("/{candidate_id}", response_model=CandidateOut)
def get_candidate(
    candidate_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return CandidateOut.model_validate(candidate)


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
