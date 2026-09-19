from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_get_requests():
    response = client.get("/requests")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_request():
    response = client.post(
        "/requests",
        json={
            "user_id": 1,
            "title": "Test projector",
            "description": "Testing request creation",
            "location": "Lab 01",
            "priority": "HIGH"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["title"] == "Test projector"
    assert data["priority"] == "HIGH"
    assert data["status"] == "OPEN"


def test_create_request_response_schema_fields():
    response = client.post(
        "/requests",
        json={
            "user_id": 1,
            "title": "Schema check",
            "description": "Verify response schema fields only",
            "location": "Lab 02",
            "priority": "MEDIUM"
        }
    )

    assert response.status_code == 200

    data = response.json()

    expected_fields = {"id", "title", "description", "location", "priority", "status"}

    assert expected_fields.issubset(data.keys())
    assert set(data.keys()) == expected_fields


def test_invalid_request():
    response = client.post(
        "/requests",
        json={
            "title": "",
            "description": "",
            "location": "",
            "priority": "URGENT"
        }
    )

    assert response.status_code == 422


def test_request_not_found():
    response = client.get("/requests/999999")

    assert response.status_code == 404