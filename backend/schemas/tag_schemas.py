from pydantic import BaseModel, ConfigDict
from schemas.user_schemas import UserShortResponse


class TagOut(BaseModel):
    id: int
    name: str
    color: str
    user: UserShortResponse

    model_config = ConfigDict(from_attributes=True)
