from tests.conftest import auth_headers
from tests.utils import make_pdf


def _create_candidate(client, headers, **overrides):
    payload = {"full_name": "Jane Doe", "email": "jane@example.com"}
    payload.update(overrides)
    return client.post("/api/v1/candidates", json=payload, headers=headers).json()


def test_upload_cv_pdf_extracts_text_and_keeps_file(client):
    headers = auth_headers(client)
    candidate = _create_candidate(client, headers)
    pdf = make_pdf("Jane Doe - Python FastAPI PostgreSQL engineer, jane@example.com")

    response = client.post(
        f"/api/v1/candidates/{candidate['id']}/cv",
        files={"file": ("jane_cv.pdf", pdf, "application/pdf")},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["cv_filename"] == "jane_cv.pdf"
    assert "FastAPI" in data["cv_text"]

    download = client.get(f"/api/v1/candidates/{candidate['id']}/cv", headers=headers)
    assert download.status_code == 200
    assert download.content.startswith(b"%PDF")


def test_upload_rejects_non_pdf(client):
    headers = auth_headers(client)
    candidate = _create_candidate(client, headers, email="nonpdf@example.com")

    response = client.post(
        f"/api/v1/candidates/{candidate['id']}/cv",
        files={"file": ("cv.txt", b"not a pdf", "text/plain")},
        headers=headers,
    )
    assert response.status_code == 400


def test_download_without_file_returns_404(client):
    headers = auth_headers(client)
    candidate = _create_candidate(client, headers, email="nofile@example.com")
    response = client.get(f"/api/v1/candidates/{candidate['id']}/cv", headers=headers)
    assert response.status_code == 404


def test_batch_upload_creates_candidates_and_reports_duplicates(client):
    headers = auth_headers(client)
    files = [
        ("files", ("alice_cv.pdf", make_pdf("Alice Smith alice@example.com Python developer"), "application/pdf")),
        ("files", ("bob_cv.pdf", make_pdf("Bob Jones bob@example.com Java developer"), "application/pdf")),
        ("files", ("alice_dup.pdf", make_pdf("Alice Clone alice@example.com"), "application/pdf")),
    ]

    response = client.post("/api/v1/candidates/batch", files=files, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert len(data["created"]) == 2
    assert len(data["errors"]) == 1
    assert {c["email"] for c in data["created"]} == {"alice@example.com", "bob@example.com"}
    assert {c["full_name"] for c in data["created"]} == {"Alice Smith", "Bob Jones"}
    assert all(c["cv_filename"] for c in data["created"])
