import datetime
import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from cdb.models.base import Base, UUIDPrimaryKeyMixin, utc_now


class ERCandidatePair(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "er_candidate_pairs"
    __table_args__ = (
        UniqueConstraint("person_a_id", "person_b_id", name="uq_er_candidate_pairs_a_b"),
        CheckConstraint("person_a_id <> person_b_id", name="ck_er_candidate_pairs_different_persons"),
    )

    person_a_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    person_b_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    match_signals: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    ml_score: Mapped[Decimal | None] = mapped_column(Numeric(4, 3), nullable=True)  # 0.000 to 1.000
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)  # 'pending' | 'accepted' | 'rejected'
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
