from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from schemas import MaintenanceRequestCreate, MaintenanceRequestUpdate
from database import SessionLocal, engine, Base
from services import maintenance_service


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
    return maintenance_service.create_request(db, request)


@app.get("/requests")
def get_requests(
    db: Session = Depends(get_db)
):
    return maintenance_service.get_requests(db)


@app.get("/requests/{request_id}")
def get_request(
    request_id: int,
    db: Session = Depends(get_db)
):
    request = maintenance_service.get_request(db, request_id)

    if request is None:
        raise HTTPException(
            status_code=404,
            detail="Request not found"
        )

    return request


@app.put("/requests/{request_id}")
def update_request(
    request_id: int,
    updated_request: MaintenanceRequestUpdate,
    db: Session = Depends(get_db)
):
    request = maintenance_service.update_request(
        db,
        request_id,
        updated_request
    )

    if request is None:
        raise HTTPException(
            status_code=404,
            detail="Request not found"
        )

    return request


@app.delete("/requests/{request_id}")
def delete_request(
    request_id: int,
    db: Session = Depends(get_db)
):
    deleted = maintenance_service.delete_request(
        db,
        request_id
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Request not found"
        )

    return {"message": "Request deleted successfully"}