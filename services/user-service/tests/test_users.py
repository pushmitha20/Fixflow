import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.database import Base, SessionLocal
from app.models import User
from app.schemas import UserCreate, UserResponse


client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_users_table():
    db = SessionLocal()
    try:
        db.query(User).delete()
        db.commit()
    finally:
        db.close()

    yield

    db = SessionLocal()
    try:
        db.query(User).delete()
        db.commit()
    finally:
        db.close()


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_user_model_table():
    assert User.__tablename__ == "users"
    assert "users" in Base.metadata.tables

    table = Base.metadata.tables["users"]
    columns = table.columns

    assert "id" in columns
    assert columns["id"].primary_key is True

    assert "name" in columns
    assert columns["name"].nullable is False

    assert "email" in columns
    assert columns["email"].unique is True
    assert columns["email"].nullable is False

    assert "role" in columns
    assert columns["role"].nullable is False


def test_user_create_valid_data_is_accepted():
    user = UserCreate(
        name="Alice Smith",
        email="alice@example.com",
        role="STUDENT",
    )

    assert user.model_dump() == {
        "name": "Alice Smith",
        "email": "alice@example.com",
        "role": "STUDENT",
    }


def test_user_create_invalid_role_is_rejected():
    with pytest.raises(ValidationError):
        UserCreate(
            name="Alice Smith",
            email="alice@example.com",
            role="GUEST",
        )


def test_user_create_invalid_email_is_rejected():
    with pytest.raises(ValidationError):
        UserCreate(
            name="Alice Smith",
            email="not-an-email",
            role="STUDENT",
        )


def test_user_response_contains_expected_fields_from_model():
    db_user = User(
        id=1,
        name="Alice Smith",
        email="alice@example.com",
        role="STUDENT",
    )

    user_response = UserResponse.model_validate(db_user)

    assert user_response.model_dump() == {
        "id": 1,
        "name": "Alice Smith",
        "email": "alice@example.com",
        "role": "STUDENT",
    }


def test_create_user_valid_request_returns_user_data():
    response = client.post(
        "/users",
        json={
            "name": "Bob Smith",
            "email": "bob@example.com",
            "role": "TECHNICIAN",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Bob Smith"
    assert data["email"] == "bob@example.com"
    assert data["role"] == "TECHNICIAN"
    assert "id" in data


def test_create_user_invalid_email_returns_422():
    response = client.post(
        "/users",
        json={
            "name": "Bob Smith",
            "email": "not-an-email",
            "role": "TECHNICIAN",
        },
    )

    assert response.status_code == 422


def test_create_user_invalid_role_returns_422():
    response = client.post(
        "/users",
        json={
            "name": "Bob Smith",
            "email": "bob@example.com",
            "role": "GUEST",
        },
    )

    assert response.status_code == 422


def test_get_users_returns_list_and_contains_created_user():
    create_response = client.post(
        "/users",
        json={
            "name": "Charlie Brown",
            "email": "charlie@example.com",
            "role": "ADMIN",
        },
    )

    assert create_response.status_code == 200
    created_user = create_response.json()

    response = client.get("/users")

    assert response.status_code == 200
    assert isinstance(response.json(), list)

    user_found = next(
        (user for user in response.json() if user["id"] == created_user["id"]),
        None,
    )

    assert user_found is not None
    assert user_found["name"] == created_user["name"]
    assert user_found["email"] == created_user["email"]
    assert user_found["role"] == created_user["role"]
