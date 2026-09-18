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

@app.post("/requests")
def create_request(request: dict):
    response = httpx.post(
        "http://localhost:8001/requests",
        json=request
    )
    response.raise_for_status()
    return response.json()