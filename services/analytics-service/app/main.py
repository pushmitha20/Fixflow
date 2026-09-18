from contextlib import asynccontextmanager
from threading import Thread

from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.kafka_consumer import consume_events
from app.schemas import AnalyticsSummaryResponse
from app.services.analytics_service import get_summary


@asynccontextmanager
async def lifespan(app: FastAPI):
    consumer_thread = Thread(
        target=consume_events,
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


@app.get(
    "/analytics/summary",
    response_model=AnalyticsSummaryResponse
)
def analytics_summary(
    db: Session = Depends(get_db)
):
    return get_summary(db)
