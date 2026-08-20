import datetime
from typing import Any

from pydantic import BaseModel, Field


class LinkedInConnectionRecord(BaseModel):
    connection_id: str
    first_name: str | None = None
    last_name: str | None = None
    profile_url: str | None = None
    email_address: str | None = None
    company: str | None = None
    position: str | None = None
    connected_at: datetime.datetime | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class LinkedInConnectionsIngestRequest(BaseModel):
    records: list[LinkedInConnectionRecord]


class LinkedInMessageRecord(BaseModel):
    conversation_id: str
    participant_names: str | None = None
    message_count: int = 0
    raw_content: str | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class LinkedInMessagesIngestRequest(BaseModel):
    records: list[LinkedInMessageRecord]


class NotionMeetingNoteRecord(BaseModel):
    page_id: str
    database_name: str | None = None
    title: str | None = None
    meeting_date: datetime.datetime | None = None
    attendees: str | None = None
    summary: str | None = None
    to_dos: list[Any] = Field(default_factory=list)
    url: str | None = None
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class NotionMeetingNotesIngestRequest(BaseModel):
    records: list[NotionMeetingNoteRecord]


class IngestResponse(BaseModel):
    queued: int
    duplicates_skipped: int = 0
    job_id: str | None = None
    status: str = "success"
