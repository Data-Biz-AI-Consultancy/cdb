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

    @property
    def is_internal(self) -> bool:
        """Determines if the person is an internal team member/employee."""
        if not self.attributes:
            attr = {}
        else:
            attr = self.attributes
        if attr.get("is_internal") is True:
            return True
        tags = attr.get("tags") or []
        if any("internal" in str(t).lower() for t in tags):
            return True
        fn = (self.first_name or "").strip().lower()
        ln = (self.last_name or "").strip().lower()
        if fn == "jimmy" and ln == "pang":
            return True
        emails = [self.primary_email] + (self.secondary_emails or [])
        for em in emails:
            if not em:
                continue
            em_low = em.strip().lower()
            if em_low.endswith("@databiz.ai") or "jimmy.pang" in em_low:
                return True
        return False
