from pathlib import Path

from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    MAX_TAGS_COUNT: int
    
    DATABASE_URL: str
    
    DEBUG: bool = False

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    model_config = ConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        extra="ignore",
        env_file_encoding="utf-8",
    )

settings = Settings()