from pydantic import BaseModel, Field, ConfigDict
from schemas.user_schemas import UserShortResponse
from schemas.tag_schemas import TagOut
from datetime import datetime


class NoteShortResponse(BaseModel):
    title: str = Field(min_length=1, max_length=50)
    updated_at: str
    is_pinned: bool
    user: UserShortResponse
    tags: list[TagOut]

    model_config = ConfigDict(from_attributes=True)


class NoteFinalize(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    content: str | None = Field(default=None)

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
