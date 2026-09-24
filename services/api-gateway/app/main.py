import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

app = FastAPI(title="FixFlow API Gateway")

# Environment values win; the localhost defaults keep local development unchanged.
# An empty value is treated as unset.
MAINTENANCE_SERVICE_URL = os.getenv("MAINTENANCE_SERVICE_URL") or "http://localhost:8001"
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL") or "http://localhost:8002"
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL") or "http://localhost:8003"
ANALYTICS_SERVICE_URL = os.getenv("ANALYTICS_SERVICE_URL") or "http://localhost:8004"
ASSIGNMENT_SERVICE_URL = os.getenv("ASSIGNMENT_SERVICE_URL") or "http://localhost:5251"

DEFAULT_CORS_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def parse_allowed_origins(value):
    # Comma-separated origins; blanks are ignored and "*" is never accepted,
    # so a misconfiguration cannot silently open the gateway to every origin.
    origins = (origin.strip() for origin in value.split(","))
    return [origin for origin in origins if origin and origin != "*"]


CORS_ALLOWED_ORIGINS = parse_allowed_origins(
    os.getenv("CORS_ALLOWED_ORIGINS") or DEFAULT_CORS_ALLOWED_ORIGINS
)

# Matches httpx's implicit default, made explicit so every downstream call shares one limit.
DOWNSTREAM_TIMEOUT_SECONDS = 5.0

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


def proxy(service_name, base_url, method, path, **kwargs):
    # Pass the downstream status and body through so 404/409/422 reach the client
    # unchanged; only a failure to reach the service (including a timeout) is
    # reported by the gateway itself.
    try:
        response = getattr(httpx, method)(
            f"{base_url}{path}",
            timeout=DOWNSTREAM_TIMEOUT_SECONDS,
            **kwargs
        )
    except httpx.RequestError:
        return JSONResponse(
            status_code=503,
            content={"detail": f"{service_name} service unavailable"}
        )

    try:
        content = response.json()
    except ValueError:
        content = {"detail": response.text or f"{service_name} service error"}

    return JSONResponse(status_code=response.status_code, content=content)


def proxy_user_service(method, path, **kwargs):
    return proxy("User", USER_SERVICE_URL, method, path, **kwargs)


def proxy_maintenance_service(method, path, **kwargs):
    return proxy("Maintenance", MAINTENANCE_SERVICE_URL, method, path, **kwargs)


def proxy_assignment_service(method, path, **kwargs):
    return proxy("Assignment", ASSIGNMENT_SERVICE_URL, method, path, **kwargs)


def proxy_notification_service(method, path, **kwargs):
    return proxy("Notification", NOTIFICATION_SERVICE_URL, method, path, **kwargs)


def proxy_analytics_service(method, path, **kwargs):
    return proxy("Analytics", ANALYTICS_SERVICE_URL, method, path, **kwargs)


@app.get("/users")
def get_users():
    return proxy_user_service("get", "/users")


@app.get("/users/{user_id}")
def get_user(user_id: int):
    return proxy_user_service("get", f"/users/{user_id}")


@app.post("/users")
def create_user(request: dict):
    return proxy_user_service("post", "/users", json=request)


@app.put("/users/{user_id}")
def update_user(user_id: int, request: dict):
    return proxy_user_service("put", f"/users/{user_id}", json=request)


@app.delete("/users/{user_id}")
def delete_user(user_id: int):
    return proxy_user_service("delete", f"/users/{user_id}")


@app.get("/assignments")
def get_assignments():
    return proxy_assignment_service("get", "/assignments")


@app.post("/assignments")
def create_assignment(request: dict):
    return proxy_assignment_service("post", "/assignments", json=request)


@app.get("/notifications")
def get_notifications():
    return proxy_notification_service("get", "/notifications")


@app.post("/notifications")
def create_notification(request: dict):
    return proxy_notification_service("post", "/notifications", json=request)


@app.get("/analytics/summary")
def get_analytics_summary():
    return proxy_analytics_service("get", "/analytics/summary")


@app.post("/requests")
def create_request(request: dict):
    return proxy_maintenance_service("post", "/requests", json=request)


@app.get("/requests")
def get_requests():
    return proxy_maintenance_service("get", "/requests")


@app.get("/requests/{request_id}")
def get_request(request_id: int):
    return proxy_maintenance_service("get", f"/requests/{request_id}")


@app.put("/requests/{request_id}")
def update_request(request_id: int, request: dict):
    return proxy_maintenance_service("put", f"/requests/{request_id}", json=request)


@app.delete("/requests/{request_id}")
def delete_request(request_id: int):
    return proxy_maintenance_service("delete", f"/requests/{request_id}")
