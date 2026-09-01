import datetime
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from cdb.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now

if TYPE_CHECKING:
    from cdb.models.company import Company
    from cdb.models.engagement import Engagement
    from cdb.models.person import Person


class Activity(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "activities"
    __table_args__ = (
        CheckConstraint(
            "person_id IS NOT NULL OR company_id IS NOT NULL OR engagement_id IS NOT NULL",
            name="ck_activities_person_or_company_required",
        ),
    )

    person_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    engagement_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("engagements.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    person: Mapped["Person | None"] = relationship("Person", lazy="selectin")
    company: Mapped["Company | None"] = relationship("Company", lazy="selectin")
    engagement: Mapped["Engagement | None"] = relationship(
        "Engagement", back_populates="activities", lazy="selectin"
    )

    type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # 'meeting' | 'email' | 'linkedin_message' | 'whatsapp' | 'call' | 'note'
    source: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # 'notion' | 'gmail' | 'linkedin' | 'whatsapp' | 'manual'
    source_id: Mapped[str | None] = mapped_column(
        String(512), unique=True, nullable=True, index=True
    )

    occurred_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    attributes: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
