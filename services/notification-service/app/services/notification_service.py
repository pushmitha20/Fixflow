from sqlalchemy.orm import Session

from app.models import Notification
from app.schemas import NotificationCreate


def create_notification(
    db: Session,
    notification: NotificationCreate
):
    new_notification = Notification(
        user_id=notification.user_id,
        message=notification.message,
        type=notification.type
    )

    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)

    return new_notification


def get_notifications(db: Session):
    return db.query(Notification).order_by(
        Notification.created_at.desc()
    ).all()


def get_notification(db: Session, notification_id: int):
    return db.query(Notification).filter(
        Notification.id == notification_id
    ).first()


def mark_as_read(db: Session, notification_id: int):
    notification = get_notification(db, notification_id)

    if notification is None:
        return None

    notification.is_read = True
    db.commit()
    db.refresh(notification)

    return notification