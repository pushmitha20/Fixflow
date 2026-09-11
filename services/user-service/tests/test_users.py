import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.database import Base
from app.models import User
from app.schemas import UserCreate, UserResponse


client = TestClient(app)


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
