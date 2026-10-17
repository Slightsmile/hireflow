from app.services.matching import match_cv_to_job
from tests.conftest import auth_headers
from tests.test_applications import create_candidate, create_job


def test_relevant_cv_scores_higher_than_unrelated_cv():
    job_description = "We need a backend engineer skilled in Python, FastAPI, and PostgreSQL."
    required_skills = "Python, FastAPI, PostgreSQL"

    strong_cv = "Backend engineer with 5 years experience in Python, FastAPI, and PostgreSQL database design."
    weak_cv = "Experienced graphic designer skilled in Photoshop, Illustrator, and branding campaigns."

    strong_result = match_cv_to_job(strong_cv, job_description, required_skills)
    weak_result = match_cv_to_job(weak_cv, job_description, required_skills)

    assert strong_result["match_score"] > weak_result["match_score"]


def test_empty_cv_handled_gracefully():
    result = match_cv_to_job("", "Backend role requiring Python", "Python")
    assert result["warning"] is not None
    assert 0 <= result["match_score"] <= 100


def test_match_score_within_range():
    result = match_cv_to_job(
        "Python developer with FastAPI and PostgreSQL experience building scalable APIs.",
        "Looking for a Python developer",
        "Python, FastAPI",
    )
    assert 0 <= result["match_score"] <= 100


def test_missing_skills_reported_consistently():
    result = match_cv_to_job(
        "Frontend developer skilled in React and CSS.",
        "Looking for a backend developer",
        "Python, PostgreSQL, Docker",
    )
    assert set(result["missing_skills"]) == {"Python", "PostgreSQL", "Docker"}
    assert result["matched_skills"] == []


def test_match_endpoint_saves_result(client):
    headers = auth_headers(client)
    job = create_job(client, headers)
    candidate = create_candidate(client, headers)
    application = client.post(
        "/api/v1/applications", json={"candidate_id": candidate["id"], "job_id": job["id"]}, headers=headers
    ).json()

    response = client.post(f"/api/v1/applications/{application['id']}/match", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_saved"] is True
    assert 0 <= data["match_score"] <= 100

    saved = client.get(f"/api/v1/applications/{application['id']}/match", headers=headers)
    assert saved.status_code == 200
