from sqlalchemy.orm import Session

from app.models import User
from app.schemas import UserCreate


def create_user(db: Session, user: UserCreate):
    new_user = User(
        name=user.name,
        email=user.email,
        role=user.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def get_users(db: Session):
    return db.query(User).all()


def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()
