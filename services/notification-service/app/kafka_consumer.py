import json
import os

from confluent_kafka import Consumer
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Notification


consumer = Consumer({
    "bootstrap.servers": os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
    "group.id": "fixflow-notification-service",
    "auto.offset.reset": "latest"
})


def consume_assignment_events():
    consumer.subscribe(["assignment-events"])

    while True:
        message = consumer.poll(1.0)

        if message is None:
            continue

        if message.error():
            print(f"Kafka error: {message.error()}")
            continue

        try:
            event_data = json.loads(message.value().decode("utf-8"))

            print(
                f"Assignment event received: "
                f"{event_data['requestId']}"
            )

            db: Session = SessionLocal()

            try:
                notification = Notification(
                    user_id=event_data["userId"],
                    message=(
                        f"Maintenance request "
                        f"#{event_data['requestId']} "
                        f"has been assigned to a technician."
                    ),
                    type="ASSIGNMENT"
                )

                db.add(notification)
                db.commit()
                db.refresh(notification)

                print(
                    f"Notification created: {notification.id}"
                )

            finally:
                db.close()
        except Exception as e:
            print(f"Error processing assignment event: {e}")