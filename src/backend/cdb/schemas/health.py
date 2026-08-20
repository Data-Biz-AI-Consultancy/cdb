from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"
    database: str = "connected"
    version: str
    environment: str
