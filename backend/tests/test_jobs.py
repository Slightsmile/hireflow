from tests.conftest import auth_headers


def create_job_payload(**overrides):
    payload = {
        "title": "Backend Engineer",
        "department": "Engineering",
        "description": "Build and maintain backend services.",
        "required_skills": "Python, FastAPI, PostgreSQL",
        "preferred_skills": "Docker",
        "experience_level": "3+ years",
        "employment_type": "full_time",
        "location": "Remote",
        "status": "published",
    }
    payload.update(overrides)
    return payload


def test_create_and_retrieve_job(client):
    headers = auth_headers(client)
    response = client.post("/api/v1/jobs", json=create_job_payload(), headers=headers)
    assert response.status_code == 201
    job = response.json()

    get_response = client.get(f"/api/v1/jobs/{job['id']}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["title"] == "Backend Engineer"


def test_create_job_rejects_empty_title(client):
    headers = auth_headers(client)
    response = client.post("/api/v1/jobs", json=create_job_payload(title=""), headers=headers)
    assert response.status_code == 422


def test_update_job(client):
    headers = auth_headers(client)
    created = client.post("/api/v1/jobs", json=create_job_payload(), headers=headers).json()

    response = client.patch(f"/api/v1/jobs/{created['id']}", json={"status": "closed"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "closed"


def test_unauthorized_job_modification_rejected(client):
    headers = auth_headers(client)
    created = client.post("/api/v1/jobs", json=create_job_payload(), headers=headers).json()

    response = client.patch(f"/api/v1/jobs/{created['id']}", json={"status": "closed"})
    assert response.status_code == 401


def test_job_search_and_filter(client):
    headers = auth_headers(client)
    client.post("/api/v1/jobs", json=create_job_payload(title="Data Scientist"), headers=headers)
    client.post("/api/v1/jobs", json=create_job_payload(title="Backend Engineer"), headers=headers)

    response = client.get("/api/v1/jobs", params={"search": "Backend"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Backend Engineer"
