import datetime
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from cdb.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now

if TYPE_CHECKING:
    from cdb.models.activity import Activity
    from cdb.models.company import Company
    from cdb.models.opportunity import Opportunity
    from cdb.models.person import Person
    from cdb.models.user import User


class Engagement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "engagements"

    title: Mapped[str] = mapped_column(String(512), nullable=False)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    opportunity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Status: 'planning' | 'active' | 'in_delivery' | 'on_hold' | 'completed' | 'cancelled'
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",
        index=True,
    )

    # Engagement Type: 'consultancy' | 'retainer' | 'fixed_fee' | 'time_and_materials' | 'advisory' | 'full_time'
    engagement_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="consultancy",
        index=True,
    )

    # Rate structure: 'hourly' | 'daily' | 'monthly' | 'fixed'
    rate_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="daily",
    )
    rate_value: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    total_value: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)

    # Contract details & Terms
    contract_ref: Mapped[str | None] = mapped_column(String(512), nullable=True)
    contract_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="signed",
    )  # 'draft' | 'pending_signature' | 'signed' | 'expired' | 'terminated'
    signed_at: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    terms_and_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timeline
    start_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    expected_end_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True, index=True)
    actual_end_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    attributes: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    # Relationships
    company: Mapped["Company"] = relationship("Company", lazy="selectin")
    opportunity: Mapped["Opportunity | None"] = relationship("Opportunity", lazy="selectin")
    owner: Mapped["User | None"] = relationship("User", lazy="selectin")
    activities: Mapped[list["Activity"]] = relationship(
        "Activity", back_populates="engagement", lazy="selectin"
    )


class EngagementPerson(Base):
    __tablename__ = "engagement_persons"

    engagement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("engagements.id", ondelete="CASCADE"),
        primary_key=True,
    )
    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )  # 'client_lead', 'technical_contact', 'stakeholder', 'sponsor', 'delivery_lead', etc.
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    # Relationships
    person: Mapped["Person"] = relationship("Person", lazy="selectin")
    engagement: Mapped["Engagement"] = relationship("Engagement", lazy="selectin")
