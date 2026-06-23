from pydantic import BaseModel, ConfigDict, Field
from schemas.util_schemas import DetailResponse
from datetime import datetime


class TagOut(BaseModel):
    id: int
    name: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=16)

class TagOutWResponse(DetailResponse):
    tag: TagOut
