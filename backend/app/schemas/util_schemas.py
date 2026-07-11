from pydantic import BaseModel, ConfigDict
from datetime import datetime


class DetailResponse(BaseModel):
    detail: str | int | bool

    model_config = ConfigDict(from_attributes=True)

class Cursor(BaseModel):
    updated_at: datetime
    id: int

    model_config = ConfigDict(from_attributes=True)
