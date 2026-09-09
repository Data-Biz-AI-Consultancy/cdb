import importlib.metadata
import tomllib
from pathlib import Path
from typing import Any

from pydantic import AliasChoices, Field, field_validator
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
        env_file=(".env", "../../.env", "../.env"),
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
    LINKEDIN_ACCESS_TOKEN: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "LINKEDIN_ACCESS_TOKEN",
            "LINKEDIN_MEMBER_DATA_PORTABILITY_API_TOKEN",
        ),
    )
    LINKEDIN_API_BASE_URL: str = "https://api.linkedin.com/rest"
    LINKEDIN_VERSION: str = "202312"
    LINKEDIN_RESTLI_PROTOCOL_VERSION: str = "2.0.0"
    LINKEDIN_SYNC_HOURS_INTERVAL: int = 6

    # Notion Direct Connector
    NOTION_API_KEY: str | None = None
    NOTION_API_BASE_URL: str = "https://api.notion.com/v1"
    NOTION_VERSION: str = "2022-06-28"
    NOTION_SYNC_HOURS_INTERVAL: int = 6
    NOTION_MEETING_NOTES_DATABASE_IDS: list[str] | str = [
        "3876e98d4ef8807eab9be1b0b029246c",  # Interview Meeting notes
        "3876e98d4ef880a6a61ae99d8912694f",  # Meetups & Seminars
        "3a36e98d4ef88084a1aec60052a3cb80",  # FaDi meeting notes
    ]

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

    @field_validator("NOTION_MEETING_NOTES_DATABASE_IDS", mode="before")
    @classmethod
    def assemble_notion_databases(cls, v: Any) -> list[str]:
        if not v:
            return [
                "3876e98d4ef8807eab9be1b0b029246c",
                "3876e98d4ef880a6a61ae99d8912694f",
                "3a36e98d4ef88084a1aec60052a3cb80",
            ]
        if isinstance(v, str):
            if v.startswith("["):
                try:
                    import json

                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(x).strip() for x in parsed if str(x).strip()]
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
            return [str(i).strip() for i in v if str(i).strip()]
        return v


settings = Settings()
