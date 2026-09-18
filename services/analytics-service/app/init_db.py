from app.database import Base, engine
from app.models import AnalyticsEvent

Base.metadata.create_all(bind=engine)

print("Analytics database tables created successfully")
