from pydantic import BaseModel, Field, field_validator, ConfigDict
from schemas.user_schemas import UserShortResponse
from core.security import DECLINED_NAMES


class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    email: str = Field(min_length=5)

    @field_validator("name")
    def name_validator(cls, v):
        if not v.strip():
            raise ValueError("Invalid name")
        if v.strip().lower() in DECLINED_NAMES:
            raise ValueError("Invalid name")
        return v.strip()
    @field_validator("email")
    def email_validator(cls, v):
        if "@" not in v or "." not in v:
            raise ValueError("Invalid email")
        return v

class UserUpdate(UserBase):
    pass

class UserRegister(UserBase):
    username: str = Field(min_length=4, max_length=16)
    password: str = Field(min_length=8)

    @field_validator("username")
    def username_validator(cls, v):
        if not v.strip():
            raise ValueError("Invalid name")
        if v.strip().lower() in DECLINED_NAMES:
            raise ValueError("Invalid name")
        return v.strip().lower()

    @field_validator("password")
    def validate_password(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Invalid password")
        return v

class UserLogin(BaseModel):
    login: str
    password: str

    @field_validator("login")
    def validate_login(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Invalid login")
        return v

    @field_validator("password")
    def validate_password(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Invalid password")
        return v

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RefreshTokenOutResponse(BaseModel):
    access_token: str
    refresh_token: str

    model_config = ConfigDict(from_attributes=True)

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str

    model_config = ConfigDict(from_attributes=True)
