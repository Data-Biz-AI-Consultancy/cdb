from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from cdb.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Company(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    industry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    size_range: Mapped[str | None] = mapped_column(String(50), nullable=True)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)  # ISO 3166-1 alpha-2
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    attributes: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
