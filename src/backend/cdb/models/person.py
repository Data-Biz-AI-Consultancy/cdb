from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from cdb.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Person(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "persons"

    # Identity
    first_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    primary_email: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    secondary_emails: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    primary_phone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(
        String(2048), unique=True, nullable=True, index=True
    )
    twitter_handle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    facebook_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    whatsapp_phone: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Location
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)  # ISO 3166-1 alpha-2

    # Profile
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    attributes: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    # Source tracking
    sources: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    source_ids: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    # Soft delete
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
