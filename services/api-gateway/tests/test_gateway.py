import httpx
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import DOWNSTREAM_TIMEOUT_SECONDS, app


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


USER = {"id": 1, "name": "Alice", "email": "alice@example.com", "role": "STUDENT"}
USER_PAYLOAD = {"name": "Alice", "email": "alice@example.com", "role": "STUDENT"}
DUPLICATE_EMAIL = {"detail": "User with this email already exists"}
NOT_FOUND = {"detail": "User not found"}
VALIDATION_ERROR = {
    "detail": [
        {
            "type": "value_error",
            "loc": ["body", "email"],
            "msg": "value is not a valid email address",
            "input": "not-an-email",
        }
    ]
}


def mock_user_service(mock, status_code, body):
    mock.return_value.status_code = status_code
    mock.return_value.json.return_value = body


@patch("app.main.httpx.get")
def test_get_user_by_id_missing_returns_404(mock_get):
    mock_user_service(mock_get, 404, NOT_FOUND)

    response = client.get("/users/999")

    assert response.status_code == 404
    assert response.json() == NOT_FOUND
    mock_get.assert_called_once_with(
        "http://localhost:8002/users/999",
        timeout=DOWNSTREAM_TIMEOUT_SECONDS,
    )


@patch("app.main.httpx.get")
def test_get_users_user_service_unreachable_returns_503(mock_get):
    mock_get.side_effect = httpx.ConnectError(
        "Connection refused",
        request=httpx.Request("GET", "http://localhost:8002/users"),
    )

    response = client.get("/users")

    assert response.status_code == 503
    assert response.json() == {"detail": "User service unavailable"}


@patch("app.main.httpx.post")
def test_create_user_route(mock_post):
    mock_user_service(mock_post, 200, USER)

    response = client.post("/users", json=USER_PAYLOAD)

    assert response.status_code == 200
    assert response.json() == USER
    mock_post.assert_called_once_with(
        "http://localhost:8002/users",
        json=USER_PAYLOAD,
        timeout=DOWNSTREAM_TIMEOUT_SECONDS,
    )


@patch("app.main.httpx.post")
def test_create_user_duplicate_email_returns_409(mock_post):
    mock_user_service(mock_post, 409, DUPLICATE_EMAIL)

    response = client.post("/users", json=USER_PAYLOAD)

    assert response.status_code == 409
    assert response.json() == DUPLICATE_EMAIL


@patch("app.main.httpx.post")
def test_create_user_invalid_payload_returns_422(mock_post):
    mock_user_service(mock_post, 422, VALIDATION_ERROR)

    response = client.post("/users", json={**USER_PAYLOAD, "email": "not-an-email"})

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR


@patch("app.main.httpx.put")
def test_update_user_route(mock_put):
    updated = {**USER, "name": "Alice Updated"}
    mock_user_service(mock_put, 200, updated)

    response = client.put("/users/1", json={**USER_PAYLOAD, "name": "Alice Updated"})

    assert response.status_code == 200
    assert response.json() == updated
    mock_put.assert_called_once_with(
        "http://localhost:8002/users/1",
        json={**USER_PAYLOAD, "name": "Alice Updated"},
        timeout=DOWNSTREAM_TIMEOUT_SECONDS
    )


@patch("app.main.httpx.put")
def test_update_user_missing_returns_404(mock_put):
    mock_user_service(mock_put, 404, NOT_FOUND)

    response = client.put("/users/999", json=USER_PAYLOAD)

    assert response.status_code == 404
    assert response.json() == NOT_FOUND


@patch("app.main.httpx.put")
def test_update_user_duplicate_email_returns_409(mock_put):
    mock_user_service(mock_put, 409, DUPLICATE_EMAIL)

    response = client.put("/users/1", json=USER_PAYLOAD)

    assert response.status_code == 409
    assert response.json() == DUPLICATE_EMAIL


@patch("app.main.httpx.put")
def test_update_user_invalid_payload_returns_422(mock_put):
    mock_user_service(mock_put, 422, VALIDATION_ERROR)

    response = client.put("/users/1", json={**USER_PAYLOAD, "email": "not-an-email"})

    assert response.status_code == 422
    assert response.json() == VALIDATION_ERROR


@patch("app.main.httpx.delete")
def test_delete_user_route(mock_delete):
    mock_user_service(mock_delete, 200, {"message": "User deleted successfully"})

    response = client.delete("/users/1")

    assert response.status_code == 200
    assert response.json() == {"message": "User deleted successfully"}
    mock_delete.assert_called_once_with(
        "http://localhost:8002/users/1",
        timeout=DOWNSTREAM_TIMEOUT_SECONDS,
    )


@patch("app.main.httpx.delete")
def test_delete_user_missing_returns_404(mock_delete):
    mock_user_service(mock_delete, 404, NOT_FOUND)

    response = client.delete("/users/999")

    assert response.status_code == 404
    assert response.json() == NOT_FOUND


def test_users_cors_preflight_allows_mutation_methods():
    for method in ["POST", "PUT", "DELETE"]:
        path = "/users" if method == "POST" else "/users/1"
        response = client.options(
            path,
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": method,
                "Access-Control-Request-Headers": "Content-Type",
            },
        )

        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
        assert method in response.headers["access-control-allow-methods"]


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
        },
        timeout=DOWNSTREAM_TIMEOUT_SECONDS
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
        "http://localhost:8001/requests/28",
        timeout=DOWNSTREAM_TIMEOUT_SECONDS
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
        "http://localhost:8001/requests",
        timeout=DOWNSTREAM_TIMEOUT_SECONDS
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
        },
        timeout=DOWNSTREAM_TIMEOUT_SECONDS
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
