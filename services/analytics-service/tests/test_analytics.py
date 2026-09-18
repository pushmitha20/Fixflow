from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import AnalyticsEvent
from app.services.analytics_service import get_summary


engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def setup_function():
    Base.metadata.create_all(bind=engine)


def teardown_function():
    Base.metadata.drop_all(bind=engine)


def test_summary_counts_requests_and_assignments():
    db = TestingSessionLocal()

    db.add_all([
        AnalyticsEvent(
            event_type="MaintenanceRequestCreated",
            request_id=1,
            user_id=2,
            priority="HIGH",
            location="Lab 01"
        ),
        AnalyticsEvent(
            event_type="MaintenanceRequestCreated",
            request_id=2,
            user_id=3,
            priority="MEDIUM",
            location="Lab 02"
        ),
        AnalyticsEvent(
            event_type="MaintenanceRequestAssigned",
            request_id=1,
            user_id=2,
            assignment_id=1,
            technician_id=1
        )
    ])

    db.commit()

    summary = get_summary(db)

    assert summary["total_requests"] == 2
    assert summary["total_assignments"] == 1
    assert summary["requests_by_priority"]["HIGH"] == 1
    assert summary["requests_by_priority"]["MEDIUM"] == 1

    db.close()


def test_summary_returns_zero_for_empty_database():
    db = TestingSessionLocal()

    summary = get_summary(db)

    assert summary["total_requests"] == 0
    assert summary["total_assignments"] == 0
    assert summary["requests_by_priority"] == {}

    db.close()
