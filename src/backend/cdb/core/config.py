import importlib.metadata
import tomllib
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _get_app_version() -> str:
    try:
        return importlib.metadata.version("cdb-backend")
    except Exception:
        pass
    try:
        pyproject_path = Path(__file__).resolve().parents[3] / "pyproject.toml"
        if pyproject_path.exists():
            with open(pyproject_path, "rb") as f:
                data = tomllib.load(f)
                return data.get("project", {}).get("version", "1.12.0")
    except Exception:
        pass
    return "1.12.0"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "CDB API"
    VERSION: str = _get_app_version()
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

    # Initial Superuser / Admin
    FIRST_SUPERUSER_EMAIL: str = "admin@cdb.internal"
    FIRST_SUPERUSER_PASSWORD: str = "admin123456"
    FIRST_SUPERUSER_FULL_NAME: str = "CDB Admin"

    # Service-to-service API key
    CDB_API_KEY: str = "development-api-key"

    # Storage Configuration (Local default / Cloudflare R2 ready)
    STORAGE_BACKEND: str = "local"  # "local" | "r2" | "s3"
    STORAGE_LOCAL_DIR: str = "./data/uploads"
    MAX_UPLOAD_SIZE_MB: int = 25
    R2_ACCOUNT_ID: str | None = None
    R2_ACCESS_KEY_ID: str | None = None
    R2_SECRET_ACCESS_KEY: str | None = None
    R2_BUCKET_NAME: str = "cdb-contracts"
    R2_ENDPOINT_URL: str | None = None

    # Ingestion & Backfill
    AUTO_BACKFILL_ON_STARTUP: bool = False

    # Direct Connectors Configuration
    LINKEDIN_ACCESS_TOKEN: str | None = None
    LINKEDIN_API_BASE_URL: str = "https://api.linkedin.com/rest"
    LINKEDIN_VERSION: str = "202312"
    LINKEDIN_RESTLI_PROTOCOL_VERSION: str = "2.0.0"
    LINKEDIN_SYNC_HOURS_INTERVAL: int = 6

    # Notion Direct Connector (future migration)
    NOTION_API_KEY: str | None = None
    NOTION_VERSION: str = "2022-06-28"

    # Optional Jager Database URL (for legacy data healing/migration)
    JAGER_DATABASE_URL: str | None = None

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://localhost:8001",
        "http://cdb.com",
        "https://cdb.com",
        "http://staging.cdb.com",
        "https://staging.cdb.com",
        "http://api.cdb.com",
        "https://api.cdb.com",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


settings = Settings()
