import datetime
import uuid
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Index, String, Text
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
    company_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
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
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # 'linkedin_message' | 'referral' | 'inbound' | 'event' | 'manual'
    source_ref_id: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    intent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    signal_strength: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'strong' | 'medium' | 'weak'
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    disqualification_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    converted_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    converted_opportunity_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="SET NULL"),
        nullable=True,
    )
