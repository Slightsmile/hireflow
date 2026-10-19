import io
import re

from pypdf import PdfReader

MAX_PAGES = 30

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}")
NAME_RE = re.compile(r"[A-Za-z][A-Za-z.'\- ]{1,58}")
RESUME_STOPWORDS = {
    "curriculum",
    "vitae",
    "resume",
    "cv",
    "profile",
    "summary",
    "objective",
    "contact",
    "address",
    "experience",
    "education",
}


def extract_pdf_text(data: bytes) -> str:
    if not data:
        raise ValueError("Uploaded file is empty")
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception as exc:  # pragma: no cover - defensive
                raise ValueError("Encrypted PDF files are not supported") from exc
        text = "\n".join((page.extract_text() or "") for page in reader.pages[:MAX_PAGES])
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError("Could not read the PDF file") from exc

    text = text.strip()
    if not text:
        raise ValueError("No extractable text found in the PDF (it may be a scanned image)")
    return text


def guess_candidate_fields(text: str, filename: str) -> dict:
    email_match = EMAIL_RE.search(text)
    phone_match = PHONE_RE.search(text)
    return {
        "full_name": _guess_name(text, filename),
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0).strip() if phone_match else None,
    }


def _guess_name(text: str, filename: str) -> str:
    regions = []
    email_match = EMAIL_RE.search(text)
    if email_match:
        regions.append(text[: email_match.start()])
    regions.append(text)

    for region in regions:
        for raw_line in region.splitlines():
            candidate = re.sub(r"\s+", " ", PHONE_RE.sub(" ", raw_line)).strip()
            if not (2 <= len(candidate) <= 60) or not NAME_RE.fullmatch(candidate):
                continue
            words = candidate.split()
            if 1 < len(words) <= 5 and not any(w.lower() in RESUME_STOPWORDS for w in words):
                return candidate
    return _name_from_filename(filename)


def _name_from_filename(filename: str) -> str:
    base = re.sub(r"\.[A-Za-z0-9]+$", "", filename or "")
    base = re.sub(r"[_\-]+", " ", base).strip()
    return base.title() or "Unknown Candidate"
