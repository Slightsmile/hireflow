from tests.conftest import auth_headers, register_user


def test_register_and_login_success(client):
    response = register_user(client)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "recruiter@example.com"
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]


def test_login_invalid_credentials_fails(client):
    register_user(client)
    response = client.post(
        "/api/v1/auth/login", json={"email": "recruiter@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_protected_endpoint_rejects_unauthenticated(client):
    response = client.get("/api/v1/jobs")
    assert response.status_code == 401


def test_me_requires_valid_token(client):
    headers = auth_headers(client)
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "recruiter@example.com"


def test_non_admin_cannot_list_users(client):
    headers = auth_headers(client, email="recruiter2@example.com", role="recruiter")
    response = client.get("/api/v1/users", headers=headers)
    assert response.status_code == 403


def test_admin_can_list_users(client):
    headers = auth_headers(client, email="admin@example.com", role="admin")
    response = client.get("/api/v1/users", headers=headers)
    assert response.status_code == 200
