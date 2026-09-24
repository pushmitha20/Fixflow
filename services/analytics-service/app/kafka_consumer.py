import json
import logging
import os

from confluent_kafka import Consumer

from app.database import SessionLocal
from app.models import AnalyticsEvent


logger = logging.getLogger(__name__)

consumer = Consumer({
    "bootstrap.servers": os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
    "group.id": "fixflow-analytics-service",
    "auto.offset.reset": "latest"
})


def process_message(value):
    event_data = json.loads(
        value.decode("utf-8")
    )

    print(
        f"Analytics event received: "
        f"{event_data.get('eventType')}"
    )

    db = SessionLocal()

    try:
        event = AnalyticsEvent(
            event_type=event_data.get("eventType"),
            request_id=event_data.get("requestId"),
            user_id=event_data.get("userId"),
            assignment_id=event_data.get("assignmentId"),
            technician_id=event_data.get("technicianId"),
            priority=event_data.get("priority"),
            location=event_data.get("location")
        )

        db.add(event)
        db.commit()
        db.refresh(event)

        print(
            f"Analytics event stored: {event.id}"
        )

    finally:
        db.close()


def consume_events():
    consumer.subscribe([
        "maintenance-events",
        "assignment-events"
    ])

    while True:
        message = consumer.poll(1.0)

        if message is None:
            continue

        if message.error():
            print(f"Kafka error: {message.error()}")
            continue

        # One malformed or unstorable event is logged and skipped so it cannot
        # kill this consumer thread.
        try:
            process_message(message.value())
        except Exception:
            logger.exception(
                "Failed to process analytics event from %s [%s] at offset %s; skipping it",
                message.topic(),
                message.partition(),
                message.offset()
            )
