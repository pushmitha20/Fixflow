from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import User
from app.schemas import UserCreate, UserResponse
from app.services import user_service

app = FastAPI(title="User Service")

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


@app.post("/users", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    return user_service.create_user(db, user)
