import datetime
import uuid
from decimal import Decimal
from typing import Any, Dict, Optional
from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from cdb.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Opportunity(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "opportunities"

    title: Mapped[str] = mapped_column(String(512), nullable=False)
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    stage: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="prospect",
        index=True,
    )  # 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'

    value: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(3), nullable=True)  # ISO 4217 e.g. 'EUR', 'USD'
    probability: Mapped[Optional[int]] = mapped_column(
        SmallInteger,
        CheckConstraint("probability BETWEEN 0 AND 100", name="ck_opportunities_probability_range"),
        nullable=True,
    )
    expected_close_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)

    source_lead_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("leads.id", ondelete="SET NULL"),
        nullable=True,
    )

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attributes: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)


class OpportunityPerson(Base):
    __tablename__ = "opportunity_persons"

    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="CASCADE"),
        primary_key=True,
    )
    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # 'decision_maker', 'champion', etc.


class OpportunityCompany(Base):
    __tablename__ = "opportunity_companies"

    opportunity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("opportunities.id", ondelete="CASCADE"),
        primary_key=True,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # 'client', 'partner', 'vendor'
