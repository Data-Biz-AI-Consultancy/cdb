from typing import Any, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail


class PaginationMetadata(BaseModel):
    page: int | None = None
    page_size: int | None = None
    next_cursor: str | None = None
    has_more: bool = False
    total: int | None = None
    total_contacts_count: int | None = None
    total_leads_count: int | None = None
    total_pipeline_value: float | None = None


class PaginatedResponse[T](BaseModel):
    data: list[T]
    pagination: PaginationMetadata
