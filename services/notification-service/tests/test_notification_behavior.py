import json
import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Notification
from app.services import notification_service
from app import kafka_consumer


class FakeMessage:
    def __init__(self, payload=None, error=None):
        self._payload = payload
        self._error = error

    def error(self):
        return self._error

    def value(self):
        return self._payload


class FakeConsumer:
    def __init__(self, messages):
        self._messages = iter(messages)

    def subscribe(self, topics):
        self.topics = topics

    def poll(self, timeout):
        try:
            return next(self._messages)
        except StopIteration:
            raise KeyboardInterrupt


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    db = Session()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_create_notification_persists_record(db_session):
    notification = notification_service.create_notification(
        db_session,
        type("Payload", (), {"user_id": 1, "message": "Hello", "type": "ASSIGNMENT"})(),
    )

    assert notification.id is not None
    assert notification.user_id == 1
    assert notification.message == "Hello"
    assert notification.type == "ASSIGNMENT"
    assert notification.is_read is False


def test_get_notifications_returns_latest_first(db_session):
    db_session.add(Notification(user_id=2, message="First", type="ASSIGNMENT"))
    db_session.add(Notification(user_id=3, message="Second", type="INFO"))
    db_session.commit()

    notifications = notification_service.get_notifications(db_session)

    assert [item.message for item in notifications] == ["Second", "First"]


def test_mark_notification_as_read_updates_flag(db_session):
    notification = Notification(user_id=4, message="Read me", type="ASSIGNMENT")
    db_session.add(notification)
    db_session.commit()

    updated = notification_service.mark_as_read(db_session, notification.id)

    assert updated is not None
    assert updated.is_read is True


def test_consume_assignment_events_ignores_malformed_json_and_handles_valid_event(monkeypatch, db_session):
    valid_event = {
        "eventType": "MaintenanceRequestAssigned",
        "requestId": 123,
        "userId": 7,
        "assignmentId": 21,
        "technicianId": 3,
    }

    fake_messages = [
        FakeMessage(b"{not valid json}"),
        FakeMessage(json.dumps({"requestId": 123}).encode("utf-8")),
        FakeMessage(json.dumps(valid_event).encode("utf-8")),
    ]

    monkeypatch.setattr(kafka_consumer, "consumer", FakeConsumer(fake_messages))
    monkeypatch.setattr(kafka_consumer, "SessionLocal", lambda: db_session)

    with pytest.raises(KeyboardInterrupt):
        kafka_consumer.consume_assignment_events()

    notifications = db_session.query(Notification).all()
    assert len(notifications) == 1
    assert notifications[0].user_id == 7
    assert notifications[0].message == "Maintenance request #123 has been assigned to a technician."
    assert notifications[0].type == "ASSIGNMENT"
