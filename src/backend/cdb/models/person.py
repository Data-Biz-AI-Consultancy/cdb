from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from cdb.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Person(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "persons"

    # Identity
    first_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    primary_email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    secondary_emails: Mapped[List[str]] = mapped_column(JSONB, nullable=False, default=list)
    primary_phone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(2048), unique=True, nullable=True, index=True)
    twitter_handle: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    facebook_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    whatsapp_phone: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Location
    city: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True) # ISO 3166-1 alpha-2

    # Profile
    avatar_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attributes: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    # Source tracking
    sources: Mapped[List[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    source_ids: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    # Soft delete
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
