from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificationCreate(BaseModel):
    user_id: int = Field(gt=0)
    message: str = Field(min_length=1, max_length=500)
    type: str = Field(min_length=1, max_length=50)


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    message: str
    type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)