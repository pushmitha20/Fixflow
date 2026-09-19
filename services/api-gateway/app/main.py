from fastapi import FastAPI
import httpx

app = FastAPI(title="FixFlow API Gateway")


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/users")
def get_users():
    response = httpx.get("http://localhost:8002/users")
    response.raise_for_status()
    return response.json()


@app.get("/users/{user_id}")
def get_user(user_id: int):
    response = httpx.get(f"http://localhost:8002/users/{user_id}")
    response.raise_for_status()
    return response.json()


@app.get("/assignments")
def get_assignments():
    response = httpx.get("http://localhost:5251/assignments")
    response.raise_for_status()
    return response.json()


@app.post("/assignments")
def create_assignment(request: dict):
    response = httpx.post(
        "http://localhost:5251/assignments",
        json=request
    )
    response.raise_for_status()
    return response.json()


@app.get("/notifications")
def get_notifications():
    response = httpx.get("http://localhost:8003/notifications")
    response.raise_for_status()
    return response.json()


@app.post("/notifications")
def create_notification(request: dict):
    response = httpx.post(
        "http://localhost:8003/notifications",
        json=request
    )
    response.raise_for_status()
    return response.json()


@app.get("/analytics/summary")
def get_analytics_summary():
    response = httpx.get("http://localhost:8004/analytics/summary")
    response.raise_for_status()
    return response.json()


@app.post("/requests")
def create_request(request: dict):
    response = httpx.post(
        "http://localhost:8001/requests",
        json=request
    )
    response.raise_for_status()
    return response.json()


@app.get("/requests")
def get_requests():
    response = httpx.get("http://localhost:8001/requests")
    response.raise_for_status()
    return response.json()


@app.get("/requests/{request_id}")
def get_request(request_id: int):
    response = httpx.get(f"http://localhost:8001/requests/{request_id}")
    response.raise_for_status()
    return response.json()