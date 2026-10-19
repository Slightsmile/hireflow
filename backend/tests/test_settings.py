from tests.conftest import auth_headers


def test_admin_can_update_and_read_ai_settings(client):
    headers = auth_headers(client, email="admin@example.com", role="admin")

    response = client.put(
        "/api/v1/settings/ai",
        json={"provider": "openai", "api_key": "sk-secret-key-1234567890", "model": "gpt-4o-mini"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_api_key"] is True
    assert data["enabled"] is True
    assert "api_key" not in data
    assert data["api_key_masked"].startswith("sk-s")
    assert "sk-secret-key-1234567890" not in response.text

    fetched = client.get("/api/v1/settings/ai", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["provider"] == "openai"


def test_recruiter_cannot_access_settings(client):
    headers = auth_headers(client, email="rec@example.com", role="recruiter")
    assert client.get("/api/v1/settings/ai", headers=headers).status_code == 403
    assert client.put("/api/v1/settings/ai", json={"api_key": "x"}, headers=headers).status_code == 403


def test_update_without_key_keeps_existing_key(client):
    headers = auth_headers(client, email="admin2@example.com", role="admin")
    client.put("/api/v1/settings/ai", json={"api_key": "sk-abcdefghijklmnop"}, headers=headers)

    response = client.put("/api/v1/settings/ai", json={"model": "gpt-4o"}, headers=headers)
    assert response.json()["has_api_key"] is True
    assert response.json()["model"] == "gpt-4o"


def test_clear_api_key(client):
    headers = auth_headers(client, email="admin3@example.com", role="admin")
    client.put("/api/v1/settings/ai", json={"api_key": "sk-abcdefghijklmnop"}, headers=headers)

    response = client.put("/api/v1/settings/ai", json={"clear_api_key": True}, headers=headers)
    assert response.json()["has_api_key"] is False
    assert response.json()["enabled"] is False


def test_test_endpoint_requires_key(client):
    headers = auth_headers(client, email="admin4@example.com", role="admin")
    response = client.post("/api/v1/settings/ai/test", headers=headers)
    assert response.status_code == 200
    assert response.json()["ok"] is False
