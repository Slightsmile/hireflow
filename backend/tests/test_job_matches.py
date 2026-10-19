from tests.conftest import auth_headers
from tests.test_applications import create_candidate, create_job


def test_top_matches_ranks_candidates(client):
    headers = auth_headers(client)
    job = create_job(client, headers)
    create_candidate(
        client,
        headers,
        email="strong@example.com",
        full_name="Strong Candidate",
        cv_text="Backend engineer with deep Python, FastAPI, and PostgreSQL experience.",
    )
    create_candidate(
        client,
        headers,
        email="weak@example.com",
        full_name="Weak Candidate",
        cv_text="Graphic designer focused on Photoshop, Illustrator, and branding.",
    )

    response = client.post(f"/api/v1/jobs/{job['id']}/matches", json={"limit": 10}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["engine"] == "tfidf"
    assert data["total_scored"] == 2
    assert data["items"][0]["full_name"] == "Strong Candidate"
    assert data["items"][0]["match_score"] >= data["items"][1]["match_score"]


def test_top_matches_honors_candidate_selection(client):
    headers = auth_headers(client)
    job = create_job(client, headers)
    selected = create_candidate(client, headers, email="one@example.com", full_name="One", cv_text="Python developer")
    create_candidate(client, headers, email="two@example.com", full_name="Two", cv_text="Python developer")

    response = client.post(
        f"/api/v1/jobs/{job['id']}/matches", json={"candidate_ids": [selected["id"]]}, headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_scored"] == 1
    assert data["items"][0]["candidate_id"] == selected["id"]


def test_top_matches_missing_job_returns_404(client):
    headers = auth_headers(client)
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = client.post(f"/api/v1/jobs/{fake_id}/matches", json={"limit": 10}, headers=headers)
    assert response.status_code == 404


def test_batch_job_upload_reports_row_errors(client):
    headers = auth_headers(client)
    csv_data = (
        "title,description,required_skills,employment_type,status\n"
        "Data Engineer,Build data pipelines,Python,full_time,published\n"
        "Bad Row,,x,full_time,draft\n"
    )
    response = client.post(
        "/api/v1/jobs/batch",
        files={"file": ("jobs.csv", csv_data.encode("utf-8"), "text/csv")},
        headers=headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data["created"]) == 1
    assert data["created"][0]["title"] == "Data Engineer"
    assert len(data["errors"]) == 1
    assert data["errors"][0]["row"] == 3


def test_batch_job_upload_requires_columns(client):
    headers = auth_headers(client)
    response = client.post(
        "/api/v1/jobs/batch",
        files={"file": ("jobs.csv", b"foo,bar\n1,2\n", "text/csv")},
        headers=headers,
    )
    assert response.status_code == 400
