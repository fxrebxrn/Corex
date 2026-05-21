from pydantic import BaseModel, Field, ConfigDict
from schemas.user_schemas import UserShortResponse
from schemas.tag_schemas import TagOut
from datetime import datetime
from schemas.util_schemas import Cursor


class NoteShortResponse(BaseModel):
    id: int
    title: str = Field(min_length=1, max_length=50)
    updated_at: datetime
    is_pinned: bool
    pinned_position: int | None
    user: UserShortResponse
    tags: list[TagOut]

    model_config = ConfigDict(from_attributes=True)


class NoteFinalize(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    content: str | None = Field(default=None, max_length=500_000)

class NoteResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str | None
    is_pinned: bool
    is_archived: bool
    is_public: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedNotesResponse(BaseModel):
    items: list[NoteShortResponse]
    limit: int
    next_cursor: Cursor | None
    has_more: bool

    model_config = ConfigDict(from_attributes=True)

class ReorderPinnedRequest(BaseModel):
    ordered_ids: list[int]
