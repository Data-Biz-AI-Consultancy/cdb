import datetime
import uuid
from typing import Optional
from sqlalchemy import Boolean, Date, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from cdb.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PersonCompanyRelationship(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "person_company_relationships"
    __table_args__ = (
        UniqueConstraint("person_id", "company_id", "title", name="uq_pcr_person_company_title"),
    )

    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    started_at: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    ended_at: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
