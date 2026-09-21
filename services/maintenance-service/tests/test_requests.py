from fastapi.testclient import TestClient
import pytest

from app.kafka_producer import KafkaPublishError
from app.main import app
from app.schemas import MaintenanceRequestCreate
from app.services import maintenance_service


client = TestClient(app)


@pytest.fixture(autouse=True)
def published_events(monkeypatch):
    events = []

    def fake_publish_event(event):
        events.append(event)

    monkeypatch.setattr(
        maintenance_service,
        "publish_event",
        fake_publish_event
    )

    return events


def test_get_requests():
    response = client.get("/requests")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_request(published_events):
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
    assert published_events == [
        {
            "eventType": "MaintenanceRequestCreated",
            "requestId": data["id"],
            "userId": 1,
            "location": "Lab 01",
            "priority": "HIGH"
        }
    ]


def test_create_request_succeeds_when_kafka_publish_fails(monkeypatch):
    def fake_publish_event(event):
        raise KafkaPublishError("Kafka unavailable")

    monkeypatch.setattr(
        maintenance_service,
        "publish_event",
        fake_publish_event
    )

    response = client.post(
        "/requests",
        json={
            "user_id": 1,
            "title": "Kafka outage",
            "description": "Verify persistence during Kafka outage",
            "location": "Lab 03",
            "priority": "LOW"
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["title"] == "Kafka outage"
    assert data["priority"] == "LOW"
    assert data["status"] == "OPEN"

    persisted_response = client.get(f"/requests/{data['id']}")

    assert persisted_response.status_code == 200
    assert persisted_response.json()["id"] == data["id"]


def test_database_failure_still_fails_request_creation(monkeypatch):
    published_events = []

    def fake_publish_event(event):
        published_events.append(event)

    class FailingDb:
        def add(self, request):
            self.request = request

        def commit(self):
            raise RuntimeError("database unavailable")

        def refresh(self, request):
            raise AssertionError("refresh should not be called")

    monkeypatch.setattr(
        maintenance_service,
        "publish_event",
        fake_publish_event
    )

    request = MaintenanceRequestCreate(
        user_id=1,
        title="Database failure",
        description="Database failure should not become success",
        location="Lab 04",
        priority="HIGH"
    )

    with pytest.raises(RuntimeError, match="database unavailable"):
        maintenance_service.create_request(FailingDb(), request)

    assert published_events == []


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
