from typing import Any

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from cdb.models.base import Base, TimestampMixin


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
