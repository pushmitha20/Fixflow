from sqlalchemy import Column, Integer, String
from app.database import Base


class MaintenanceRequest(Base):
    __tablename__ = "maintenance_requests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    location = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    status = Column(String, nullable=False)