
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "CDB API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # PostgreSQL connection URLs
    DATABASE_URL: str = "postgresql+asyncpg://cdb:cdb@localhost:5433/cdb"
    SYNC_DATABASE_URL: str = "postgresql://cdb:cdb@localhost:5433/cdb"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6380/0"
    CELERY_BROKER_URL: str = "redis://localhost:6380/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6380/0"

    # Security & Auth
    SECRET_KEY: str = "development-secret-key-at-least-32-characters-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Service-to-service API key
    CDB_API_KEY: str = "development-api-key"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://localhost:8001",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


settings = Settings()
