from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app


client = TestClient(app)


def test_health_check():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_requests_cors_preflight_allows_vite_origin():
    response = client.options(
        "/requests",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "GET" in response.headers["access-control-allow-methods"]
    assert "Content-Type" in response.headers["access-control-allow-headers"]


def test_requests_cors_preflight_rejects_unknown_origin():
    response = client.options(
        "/requests",
        headers={
            "Origin": "http://example.com",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


@patch("app.main.httpx.get")
def test_get_users_route_exists(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = [
        {"id": 1, "name": "Alice", "email": "alice@example.com", "role": "STUDENT"}
    ]
    mock_get.return_value.raise_for_status.return_value = None

    response = client.get("/users")

    assert response.status_code == 200
    assert response.json() == [
        {"id": 1, "name": "Alice", "email": "alice@example.com", "role": "STUDENT"}
    ]


@patch("app.main.httpx.get")
def test_get_user_by_id_route_exists(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "role": "STUDENT",
    }
    mock_get.return_value.raise_for_status.return_value = None

    response = client.get("/users/1")

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "role": "STUDENT",
    }


@patch("app.main.httpx.post")
def test_create_request_route(mock_post):
    mock_post.return_value.status_code = 200
    mock_post.return_value.json.return_value = {
        "id": 27,
        "title": "Projector issue",
        "description": "Projector is not working",
        "location": "Lab 03",
        "priority": "HIGH",
        "status": "OPEN"
    }
    mock_post.return_value.raise_for_status.return_value = None

    response = client.post(
        "/requests",
        json={
            "user_id": 2,
            "title": "Projector issue",
            "description": "Projector is not working",
            "location": "Lab 03",
            "priority": "HIGH"
        }
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": 27,
        "title": "Projector issue",
        "description": "Projector is not working",
        "location": "Lab 03",
        "priority": "HIGH",
        "status": "OPEN"
    }

    mock_post.assert_called_once_with(
        "http://localhost:8001/requests",
        json={
            "user_id": 2,
            "title": "Projector issue",
            "description": "Projector is not working",
            "location": "Lab 03",
            "priority": "HIGH"
        }
    )


@patch("app.main.httpx.get")
def test_get_request_by_id_route(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {
        "id": 28,
        "title": "Gateway test",
        "description": "Testing request through API Gateway",
        "location": "Lab 03",
        "priority": "HIGH",
        "status": "OPEN"
    }
    mock_get.return_value.raise_for_status.return_value = None

    response = client.get("/requests/28")

    assert response.status_code == 200
    assert response.json() == {
        "id": 28,
        "title": "Gateway test",
        "description": "Testing request through API Gateway",
        "location": "Lab 03",
        "priority": "HIGH",
        "status": "OPEN"
    }

    mock_get.assert_called_once_with(
        "http://localhost:8001/requests/28"
    )


@patch("app.main.httpx.get")
def test_get_requests_route(mock_get):
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = [
        {
            "id": 28,
            "title": "Gateway test",
            "description": "Testing request through API Gateway",
            "location": "Lab 03",
            "priority": "HIGH",
            "status": "OPEN"
        }
    ]
    mock_get.return_value.raise_for_status.return_value = None

    response = client.get("/requests")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": 28,
            "title": "Gateway test",
            "description": "Testing request through API Gateway",
            "location": "Lab 03",
            "priority": "HIGH",
            "status": "OPEN"
        }
    ]

    mock_get.assert_called_once_with(
        "http://localhost:8001/requests"
    )


@patch("app.main.httpx.put")
def test_update_request_route(mock_put):
    mock_put.return_value.status_code = 200
    mock_put.return_value.json.return_value = {
        "id": 28,
        "title": "Updated gateway test",
        "description": "Testing request update through API Gateway",
        "location": "Lab 04",
        "priority": "MEDIUM",
        "status": "IN_PROGRESS"
    }
    mock_put.return_value.raise_for_status.return_value = None

    response = client.put(
        "/requests/28",
        json={
            "title": "Updated gateway test",
            "description": "Testing request update through API Gateway",
            "location": "Lab 04",
            "priority": "MEDIUM",
            "status": "IN_PROGRESS"
        }
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": 28,
        "title": "Updated gateway test",
        "description": "Testing request update through API Gateway",
        "location": "Lab 04",
        "priority": "MEDIUM",
        "status": "IN_PROGRESS"
    }

    mock_put.assert_called_once_with(
        "http://localhost:8001/requests/28",
        json={
            "title": "Updated gateway test",
            "description": "Testing request update through API Gateway",
            "location": "Lab 04",
            "priority": "MEDIUM",
            "status": "IN_PROGRESS"
        }
    )


@patch("app.main.httpx.delete")
def test_delete_request_route(mock_delete):
    mock_delete.return_value.status_code = 200
    mock_delete.return_value.json.return_value = {
        "message": "Request deleted successfully"
    }
    mock_delete.return_value.raise_for_status.return_value = None

    response = client.delete("/requests/28")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Request deleted successfully"
    }

    mock_delete.assert_called_once_with(
        "http://localhost:8001/requests/28"
    )
