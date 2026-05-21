from pydantic import BaseModel, Field, ConfigDict
from schemas.user_schemas import UserShortResponse
from schemas.tag_schemas import TagOut


class NoteShortResponse(BaseModel):
    title: str = Field(min_length=1, max_length=50)
    updated_at: str
    is_pinned: bool
    user: UserShortResponse
    tags: list[TagOut]

    model_config = ConfigDict(from_attributes=True)
