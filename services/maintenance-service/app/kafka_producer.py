from confluent_kafka import Producer
import json

producer = Producer({
    "bootstrap.servers": "localhost:9092"
})

def publish_event(event):
    producer.produce(
        "maintenance-events",
        value=json.dumps(event).encode("utf-8")
    )
    producer.flush()