from pydantic import BaseModel


class AnalyticsSummaryResponse(BaseModel):
    total_requests: int
    total_assignments: int
    requests_by_priority: dict[str, int]
