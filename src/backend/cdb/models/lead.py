import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from cdb.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Lead(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "leads"

    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    stage: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="new",
        index=True,
    )  # 'new' | 'contacted' | 'qualified' | 'converted' | 'disqualified'
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)  # 'linkedin_message' | 'referral' | 'inbound' | 'event' | 'manual'
    source_ref_id: Mapped[str | None] = mapped_column(String(512), nullable=True)

    intent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    signal_strength: Mapped[str | None] = mapped_column(String(50), nullable=True)  # 'strong' | 'medium' | 'weak'
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    disqualification_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    converted_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    converted_opportunity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="SET NULL"),
        nullable=True,
    )
