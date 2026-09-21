import logging

from app.kafka_producer import KafkaPublishError, publish_event
from sqlalchemy.orm import Session

from app.models import MaintenanceRequest
from app.schemas import MaintenanceRequestCreate, MaintenanceRequestUpdate


logger = logging.getLogger(__name__)


def create_request(
    db: Session,
    request: MaintenanceRequestCreate
):
    new_request = MaintenanceRequest(
        user_id=request.user_id,
        title=request.title,
        description=request.description,
        location=request.location,
        priority=request.priority,
        status="OPEN"
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    event = {
        "eventType": "MaintenanceRequestCreated",
        "requestId": new_request.id,
        "userId": new_request.user_id,
        "location": new_request.location,
        "priority": new_request.priority
    }

    try:
        publish_event(event)
    except KafkaPublishError:
        logger.exception(
            "Maintenance request %s was persisted, but Kafka publication failed",
            new_request.id
        )

    return new_request


def get_requests(db: Session):
    return db.query(MaintenanceRequest).all()


def get_request(
    db: Session,
    request_id: int
):
    return db.query(MaintenanceRequest).filter(
        MaintenanceRequest.id == request_id
    ).first()


def update_request(
    db: Session,
    request_id: int,
    updated_request: MaintenanceRequestUpdate
):
    request = get_request(db, request_id)

    if request is None:
        return None

    request.title = updated_request.title
    request.description = updated_request.description
    request.location = updated_request.location
    request.priority = updated_request.priority
    request.status = updated_request.status

    db.commit()
    db.refresh(request)

    return request


def delete_request(
    db: Session,
    request_id: int
):
    request = get_request(db, request_id)

    if request is None:
        return False

    db.delete(request)
    db.commit()

    return True
