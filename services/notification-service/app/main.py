from contextlib import asynccontextmanager
from threading import Thread

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.database import Base, SessionLocal, engine
from app.kafka_consumer import consume_assignment_events
from app.schemas import NotificationCreate, NotificationResponse
from app.services import notification_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    consumer_thread = Thread(
        target=consume_assignment_events,
        daemon=True
    )

    consumer_thread.start()

    yield


app = FastAPI(lifespan=lifespan)

Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/notifications", response_model=NotificationResponse)
def create_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db)
):
    return notification_service.create_notification(
        db,
        notification
    )


@app.get(
    "/notifications",
    response_model=list[NotificationResponse]
)
def get_notifications(
    db: Session = Depends(get_db)
):
    return notification_service.get_notifications(db)


@app.get(
    "/notifications/{notification_id}",
    response_model=NotificationResponse
)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db)
):
    notification = notification_service.get_notification(
        db,
        notification_id
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return notification


@app.patch(
    "/notifications/{notification_id}/read",
    response_model=NotificationResponse
)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    notification = notification_service.mark_as_read(
        db,
        notification_id
    )

    if notification is None:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    return notification