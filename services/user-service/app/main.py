from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models import User
from app.schemas import UserCreate, UserResponse, UserUpdate
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


@app.get("/users", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db)
):
    return user_service.get_users(db)


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    user = user_service.get_user(db, user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db)
):
    user = user_service.update_user(db, user_id, user_data)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    deleted = user_service.delete_user(db, user_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}


@app.post("/users", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    return user_service.create_user(db, user)
