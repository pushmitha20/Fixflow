from fastapi import FastAPI

from app.database import engine, Base
from app.models import User

app = FastAPI(title="User Service")

Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "healthy"}
