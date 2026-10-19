import re
import uuid
from pathlib import Path

from app.core.config import settings


def _safe_name(filename: str) -> str:
    name = Path(filename or "cv.pdf").name
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    return name[:120] or "cv.pdf"


def _cv_dir() -> Path:
    path = Path(settings.upload_dir).resolve() / "cv"
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_cv_file(data: bytes, candidate_id: uuid.UUID, filename: str) -> tuple[str, str]:
    safe_name = _safe_name(filename)
    dest = _cv_dir() / f"{candidate_id}_{safe_name}"
    dest.write_bytes(data)
    return safe_name, str(dest)


def resolve_cv_path(stored_path: str) -> Path:
    return Path(stored_path)
