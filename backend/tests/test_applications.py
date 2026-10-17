from tests.conftest import auth_headers


def create_job(client, headers, **overrides):
    payload = {
        "title": "Backend Engineer",
        "department": "Engineering",
        "description": "Build and maintain backend services using Python and PostgreSQL.",
        "required_skills": "Python, FastAPI, PostgreSQL",
        "preferred_skills": "Docker",
        "experience_level": "3+ years",
        "employment_type": "full_time",
        "location": "Remote",
        "status": "published",
    }
    payload.update(overrides)
    return client.post("/api/v1/jobs", json=payload, headers=headers).json()


def create_candidate(client, headers, **overrides):
    payload = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "123-456-7890",
        "cv_text": "Experienced backend engineer skilled in Python, FastAPI, and PostgreSQL development.",
    }
    payload.update(overrides)
    return client.post("/api/v1/candidates", json=payload, headers=headers).json()


def test_create_application_success(client):
    headers = auth_headers(client)
    job = create_job(client, headers)
    candidate = create_candidate(client, headers)

    response = client.post(
        "/api/v1/applications", json={"candidate_id": candidate["id"], "job_id": job["id"]}, headers=headers
    )
    assert response.status_code == 201
    assert response.json()["status"] == "applied"


def test_duplicate_application_rejected(client):
    headers = auth_headers(client)
    job = create_job(client, headers)
    candidate = create_candidate(client, headers)

    client.post("/api/v1/applications", json={"candidate_id": candidate["id"], "job_id": job["id"]}, headers=headers)
    response = client.post(
        "/api/v1/applications", json={"candidate_id": candidate["id"], "job_id": job["id"]}, headers=headers
    )
    assert response.status_code == 409


def test_closed_job_rejects_new_applications(client):
    headers = auth_headers(client)
    job = create_job(client, headers, status="closed")
    candidate = create_candidate(client, headers)

    response = client.post(
        "/api/v1/applications", json={"candidate_id": candidate["id"], "job_id": job["id"]}, headers=headers
    )
    assert response.status_code == 400


def test_invalid_status_transition_rejected(client):
    headers = auth_headers(client)
    job = create_job(client, headers)
    candidate = create_candidate(client, headers)
    application = client.post(
        "/api/v1/applications", json={"candidate_id": candidate["id"], "job_id": job["id"]}, headers=headers
    ).json()

    client.patch(f"/api/v1/applications/{application['id']}/status", json={"status": "hired"}, headers=headers)
    response = client.patch(
        f"/api/v1/applications/{application['id']}/status", json={"status": "interview"}, headers=headers
    )
    assert response.status_code == 400


def test_application_requires_existing_candidate_and_job(client):
    headers = auth_headers(client)
    job = create_job(client, headers)
    fake_id = "00000000-0000-0000-0000-000000000000"

    response = client.post(
        "/api/v1/applications", json={"candidate_id": fake_id, "job_id": job["id"]}, headers=headers
    )
    assert response.status_code == 404
