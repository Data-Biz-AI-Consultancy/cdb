import uuid
from typing import Any

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from cdb.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PersonAction(Base, TimestampMixin):
    __tablename__ = "person_actions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # slug / action key
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )  # 'profile', 'segmentation', 'entity_resolution', 'pipeline', 'career', 'bulk_ops'
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)


class PersonHistory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "person_history"

    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("person_actions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    field_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    old_value: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    new_value: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    changes: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    action: Mapped[PersonAction] = relationship("PersonAction", lazy="joined")
