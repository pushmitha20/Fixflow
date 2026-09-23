from sqlalchemy import exc
from sqlalchemy.orm import Session

from app.models import User
from app.schemas import UserCreate, UserUpdate


def create_user(db: Session, user: UserCreate):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user is not None:
        raise exc.IntegrityError(
            statement=None,
            params=None,
            orig=Exception("User with this email already exists")
        )

    new_user = User(
        name=user.name,
        email=user.email,
        role=user.role,
    )

    db.add(new_user)
    try:
        db.commit()
    except exc.IntegrityError as exc_error:
        db.rollback()
        raise exc_error
    db.refresh(new_user)

    return new_user


def get_users(db: Session):
    return db.query(User).all()


def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def update_user(db: Session, user_id: int, user_data: UserUpdate):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        return None

    email_owner = db.query(User).filter(
        User.email == user_data.email,
        User.id != user_id
    ).first()
    if email_owner is not None:
        raise exc.IntegrityError(
            statement=None,
            params=None,
            orig=Exception("User with this email already exists")
        )

    user.name = user_data.name
    user.email = user_data.email
    user.role = user_data.role

    try:
        db.commit()
    except exc.IntegrityError as exc_error:
        db.rollback()
        raise exc_error
    db.refresh(user)

    return user


def delete_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        return False

    db.delete(user)
    db.commit()

    return True
