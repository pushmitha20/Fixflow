import json

from confluent_kafka import Consumer

from app.database import SessionLocal
from app.models import AnalyticsEvent


consumer = Consumer({
    "bootstrap.servers": "localhost:9092",
    "group.id": "fixflow-analytics-service",
    "auto.offset.reset": "latest"
})


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

        event_data = json.loads(
            message.value().decode("utf-8")
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
