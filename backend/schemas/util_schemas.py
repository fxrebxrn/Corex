from pydantic import BaseModel, ConfigDict


class DetailResponse(BaseModel):
    detail: str | int | bool

    model_config = ConfigDict(from_attributes=True)
