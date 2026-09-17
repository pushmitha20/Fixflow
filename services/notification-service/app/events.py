from pydantic import BaseModel


class MaintenanceRequestAssignedEvent(BaseModel):
    eventType: str
    requestId: int
    userId: int
    assignmentId: int
    technicianId: int