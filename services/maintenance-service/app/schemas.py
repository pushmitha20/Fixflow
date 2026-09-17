from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MaintenanceRequestCreate(BaseModel):
    user_id: int = Field(gt=0)
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(min_length=5, max_length=500)
    location: str = Field(min_length=2, max_length=100)
    priority: Literal["LOW", "MEDIUM", "HIGH"]

class MaintenanceRequestUpdate(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    description: str = Field(min_length=5, max_length=500)
    location: str = Field(min_length=2, max_length=100)
    priority: Literal["LOW", "MEDIUM", "HIGH"]
    status: Literal["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]


class MaintenanceRequestResponse(BaseModel):
    id: int
    title: str
    description: str
    location: str
    priority: str
    status: str

    model_config = ConfigDict(from_attributes=True)