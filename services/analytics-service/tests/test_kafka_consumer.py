import json
import logging
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import AnalyticsEvent

# Patch the Kafka client before import so no test ever talks to a real broker.
with patch("confluent_kafka.Consumer"):
    from app import kafka_consumer


engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

CREATED_EVENT = {
    "eventType": "MaintenanceRequestCreated",
    "requestId": 56,
    "userId": 53,
    "location": "Integration Test Area",
    "priority": "MEDIUM"
}


class StopConsuming(BaseException):
    """Ends the infinite consumer loop; BaseException so the loop cannot catch it."""


def fake_message(value, offset):
    message = MagicMock()
    message.error.return_value = None
    message.value.return_value = value
    message.topic.return_value = "maintenance-events"
    message.partition.return_value = 0
    message.offset.return_value = offset
    return message


def stored_events():
    db = TestingSessionLocal()
    try:
        return db.query(AnalyticsEvent).all()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def test_database():
    Base.metadata.create_all(bind=engine)

    with patch.object(kafka_consumer, "SessionLocal", TestingSessionLocal):
        yield

    Base.metadata.drop_all(bind=engine)


def run_consumer_with(messages):
    fake_consumer = MagicMock()
    fake_consumer.poll.side_effect = [*messages, StopConsuming()]

    with patch.object(kafka_consumer, "consumer", fake_consumer):
        with pytest.raises(StopConsuming):
            kafka_consumer.consume_events()


def test_process_message_stores_valid_event():
    kafka_consumer.process_message(json.dumps(CREATED_EVENT).encode("utf-8"))

    events = stored_events()

    assert len(events) == 1
    assert events[0].event_type == "MaintenanceRequestCreated"
    assert events[0].request_id == 56
    assert events[0].priority == "MEDIUM"


def test_consumer_skips_malformed_json_and_processes_next_event(caplog):
    with caplog.at_level(logging.ERROR, logger="app.kafka_consumer"):
        run_consumer_with([
            fake_message(b"{not valid json", offset=41),
            fake_message(json.dumps(CREATED_EVENT).encode("utf-8"), offset=42),
        ])

    events = stored_events()

    assert [event.request_id for event in events] == [56]
    assert "maintenance-events [0] at offset 41" in caplog.text
    assert "JSONDecodeError" in caplog.text


def test_consumer_skips_unstorable_event_and_processes_next_event(caplog):
    # requestId is NOT NULL in analytics_events, so this event fails at commit time.
    missing_request_id = {**CREATED_EVENT, "requestId": None}

    with caplog.at_level(logging.ERROR, logger="app.kafka_consumer"):
        run_consumer_with([
            fake_message(json.dumps(missing_request_id).encode("utf-8"), offset=7),
            fake_message(json.dumps(CREATED_EVENT).encode("utf-8"), offset=8),
        ])

    events = stored_events()

    assert [event.request_id for event in events] == [56]
    assert "at offset 7" in caplog.text
    assert "IntegrityError" in caplog.text
