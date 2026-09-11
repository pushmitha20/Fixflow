from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app


client = TestClient(app)


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@patch("app.main.httpx.get")
def test_get_users_route_exists(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = [
        {"id": 1, "name": "Alice", "email": "alice@example.com", "role": "STUDENT"}
    ]
    mock_get.return_value.raise_for_status.return_value = None

    response = client.get("/users")

    assert response.status_code == 200
    assert response.json() == [
        {"id": 1, "name": "Alice", "email": "alice@example.com", "role": "STUDENT"}
    ]


@patch("app.main.httpx.get")
def test_get_user_by_id_route_exists(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "role": "STUDENT",
    }
    mock_get.return_value.raise_for_status.return_value = None

    response = client.get("/users/1")

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "role": "STUDENT",
    }
