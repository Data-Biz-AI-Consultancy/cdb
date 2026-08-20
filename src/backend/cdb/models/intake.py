import datetime
import uuid
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from cdb.models.base import Base, UUIDPrimaryKeyMixin, utc_now


class IntakeLinkedInConnection(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "intake_linkedin_connections"

    connection_id: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    first_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    profile_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    email_address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    connected_at: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")  # 'pending' | 'resolved' | 'error'
    resolved_person_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="SET NULL"),
        nullable=True,
    )
    ingested_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )


class IntakeLinkedInMessage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "intake_linkedin_messages"

    conversation_id: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    participant_names: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    raw_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    resolved_person_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("persons.id", ondelete="SET NULL"),
        nullable=True,
    )
    ingested_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )


class IntakeNotionMeetingNote(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "intake_notion_meeting_notes"

    page_id: Mapped[str] = mapped_column(String(512), unique=True, nullable=False, index=True)
    database_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    meeting_date: Mapped[datetime.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attendees: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_dos: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    ingested_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )


class IntakeManual(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "intake_manual"

    upload_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    source_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False, default="person")  # 'person' | 'company'
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    resolved_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    ingested_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
