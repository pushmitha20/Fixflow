from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from schemas import MaintenanceRequestCreate, MaintenanceRequestUpdate
from database import SessionLocal, engine, Base
from models import MaintenanceRequest

app = FastAPI()

Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/requests")
def create_request(
    request: MaintenanceRequestCreate,
    db: Session = Depends(get_db)
):
    new_request = MaintenanceRequest(
        title=request.title,
        description=request.description,
        location=request.location,
        priority=request.priority,
        status="OPEN"
    )

    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    return new_request


@app.get("/requests")
def get_requests(db: Session = Depends(get_db)):
    requests = db.query(MaintenanceRequest).all()

    return requests


@app.get("/requests/{request_id}")
def get_request(
    request_id: int,
    db: Session = Depends(get_db)
):
    request = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.id == request_id
    ).first()

    if request is None:
        return {"error": "Request not found"}

    return request

    

@app.put("/requests/{request_id}")
def update_request(
    request_id: int,
    updated_request: MaintenanceRequestUpdate,
    db: Session = Depends(get_db)
):
    request = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.id == request_id
    ).first()

    if request is None:
        return {"error": "Request not found"}

    request.title = updated_request.title
    request.description = updated_request.description
    request.location = updated_request.location
    request.priority = updated_request.priority
    request.status = updated_request.status

    db.commit()
    db.refresh(request)

    return request

@app.delete("/requests/{request_id}")
def delete_request(request_id: int):
    for request in maintenance_requests:
        if request["id"] == request_id:
            maintenance_requests.remove(request)
            return {"message": "Request deleted successfully"}

    return {"error": "Request not found"}
