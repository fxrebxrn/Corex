from pydantic import BaseModel, ConfigDict, field_validator
from schemas.util_schemas import DetailResponse
from core.security import DECLINED_NAMES


class UserShortResponse(BaseModel):
    id: int
    name: str
    username: str

    model_config = ConfigDict(from_attributes=True)

class UserProfileResponse(UserShortResponse):
    all_notes_count: int
    archived_notes_count: int
    
    model_config = ConfigDict(from_attributes=True)

class UpdateUser(BaseModel):
    name: str
    username: str

    @field_validator("name")
    def name_validator(cls, v):
        if not v.strip():
            raise ValueError("Invalid name")
        if v.strip().lower() in DECLINED_NAMES:
            raise ValueError("Invalid name")
        return v.strip()

    @field_validator("username")
    def username_validator(cls, v):
        if not v.strip():
            raise ValueError("Invalid name")
        if v.strip().lower() in DECLINED_NAMES:
            raise ValueError("Invalid name")
        return v.strip().lower()

class UserProfileWDetailResponse(DetailResponse):
    user: UserShortResponse

    model_config = ConfigDict(from_attributes=True)

class EmailWDetailResponse(DetailResponse):
    email: str

    model_config = ConfigDict(from_attributes=True)
