import datetime
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from cdb.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, utc_now

if TYPE_CHECKING:
    from cdb.models.activity import Activity
    from cdb.models.company import Company
    from cdb.models.engagement import Engagement
    from cdb.models.opportunity import Opportunity
    from cdb.models.person import Person
    from cdb.models.user import User


class Signal(Base, TimestampMixin):
    __tablename__ = "signals"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # slug / signal identifier
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # 'opportunity' | 'risk' | 'hybrid'
    target_entity: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # 'company' | 'person' | 'opportunity' | 'engagement'
    severity: Mapped[str] = mapped_column(
        String(50), nullable=False, default="medium"
    )  # 'critical' | 'high' | 'medium' | 'low'
    detection_mechanism: Mapped[str] = mapped_column(
        String(50), nullable=False, default="deterministic_rule"
    )  # 'deterministic_rule' | 'temporal_cadence' | 'text_pattern' | 'enrichment_feed'

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_interpretation: Mapped[str] = mapped_column(Text, nullable=False)
    parameters: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    recommended_action: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)

    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)


class DetectedSignal(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "detected_signals"
    __table_args__ = (
        CheckConstraint(
            "company_id IS NOT NULL OR person_id IS NOT NULL OR opportunity_id IS NOT NULL OR engagement_id IS NOT NULL",
            name="ck_detected_signals_target_required",
        ),
    )

    signal_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("signals.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    person_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    opportunity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    engagement_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("engagements.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    activity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("activities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="active",
        index=True,
    )  # 'active' | 'acknowledged' | 'actioned' | 'dismissed' | 'resolved'

    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="medium",
        index=True,
    )  # 'critical' | 'high' | 'medium' | 'low'

    score: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_payload: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    actioned_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actioned_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    detected_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    signal: Mapped[Signal] = relationship("Signal", lazy="joined")
    company: Mapped["Company | None"] = relationship("Company", lazy="selectin")
    person: Mapped["Person | None"] = relationship("Person", lazy="selectin")
    opportunity: Mapped["Opportunity | None"] = relationship("Opportunity", lazy="selectin")
    engagement: Mapped["Engagement | None"] = relationship("Engagement", lazy="selectin")
    activity: Mapped["Activity | None"] = relationship("Activity", lazy="selectin")
    actioned_by: Mapped["User | None"] = relationship("User", lazy="selectin")
    signal_persons: Mapped[list["DetectedSignalPerson"]] = relationship(
        "DetectedSignalPerson",
        back_populates="signal",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    connected_persons: Mapped[list["Person"]] = relationship(
        "Person",
        secondary="detected_signal_persons",
        lazy="selectin",
        viewonly=True,
    )


class DetectedSignalPerson(Base):
    __tablename__ = "detected_signal_persons"

    detected_signal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("detected_signals.id", ondelete="CASCADE"),
        primary_key=True,
    )
    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    # Relationships
    signal: Mapped["DetectedSignal"] = relationship(
        "DetectedSignal", back_populates="signal_persons"
    )
    person: Mapped["Person"] = relationship("Person", lazy="selectin")
