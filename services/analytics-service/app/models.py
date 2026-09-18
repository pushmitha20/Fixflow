from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from app.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False)
    request_id = Column(Integer, nullable=False)
    user_id = Column(Integer, nullable=True)
    assignment_id = Column(Integer, nullable=True)
    technician_id = Column(Integer, nullable=True)
    priority = Column(String, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
