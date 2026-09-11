from fastapi.testclient import TestClient

from app.main import app
from app.database import Base
from app.models import User


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
