from pydantic import BaseModel


class MaintenanceRequestCreate(BaseModel):
    title: str
    description: str
    location: str
    priority: str

class MaintenanceRequestUpdate(BaseModel):
    title: str
    description: str
    location: str
    priority: str
    status: str 