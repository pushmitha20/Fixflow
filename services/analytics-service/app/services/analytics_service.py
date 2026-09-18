from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import AnalyticsEvent


def get_summary(db: Session):
    total_requests = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.event_type == "MaintenanceRequestCreated"
    ).count()

    total_assignments = db.query(AnalyticsEvent).filter(
        AnalyticsEvent.event_type == "MaintenanceRequestAssigned"
    ).count()

    priority_counts = db.query(
        AnalyticsEvent.priority,
        func.count(AnalyticsEvent.id)
    ).filter(
        AnalyticsEvent.event_type == "MaintenanceRequestCreated"
    ).group_by(
        AnalyticsEvent.priority
    ).all()

    requests_by_priority = {
        priority: count
        for priority, count in priority_counts
    }

    return {
        "total_requests": total_requests,
        "total_assignments": total_assignments,
        "requests_by_priority": requests_by_priority
    }
