import json
import logging
import os

from confluent_kafka import KafkaException, Producer

from app.kafka_config import kafka_security_config


logger = logging.getLogger(__name__)

KAFKA_TOPIC = "maintenance-events"
KAFKA_FLUSH_TIMEOUT_SECONDS = float(
    os.getenv("KAFKA_FLUSH_TIMEOUT_SECONDS", "2.0")
)

producer = Producer({
    "bootstrap.servers": os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
    "message.timeout.ms": int(KAFKA_FLUSH_TIMEOUT_SECONDS * 1000),
    "socket.timeout.ms": int(KAFKA_FLUSH_TIMEOUT_SECONDS * 1000),
    "request.timeout.ms": int(KAFKA_FLUSH_TIMEOUT_SECONDS * 1000),
    **kafka_security_config(),
})


class KafkaPublishError(RuntimeError):
    pass


def publish_event(event):
    delivery_errors = []

    def delivery_report(error, message):
        if error is not None:
            delivery_errors.append(error)

    try:
        producer.produce(
            KAFKA_TOPIC,
            value=json.dumps(event).encode("utf-8"),
            callback=delivery_report
        )

        remaining_messages = producer.flush(KAFKA_FLUSH_TIMEOUT_SECONDS)

    except (BufferError, KafkaException) as exc:
        logger.exception(
            "Kafka publish failed for event %s",
            event.get("eventType")
        )
        raise KafkaPublishError(str(exc)) from exc

    if delivery_errors:
        logger.error(
            "Kafka delivery failed for event %s: %s",
            event.get("eventType"),
            delivery_errors[0]
        )
        raise KafkaPublishError(str(delivery_errors[0]))

    if remaining_messages > 0:
        producer.purge()
        producer.poll(0)
        message = (
            f"Kafka publish timed out for event "
            f"{event.get('eventType')} with "
            f"{remaining_messages} message(s) still pending"
        )
        logger.error(message)
        raise KafkaPublishError(message)
