import bcrypt
from jose import jwt, ExpiredSignatureError
from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends
from core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from config.settings import settings
import logging
from core.exceptions import InvalidTokenError, ExpiredTokenError
from typing import Annotated
from repositories.user_repository import UserRepository
from core.redis_blacklist import is_blacklisted


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

logger = logging.getLogger(__name__)

DECLINED_NAMES = ["admin", "root", "test"]

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        password=plain_password.encode('utf-8'),
        hashed_password=hashed_password.encode('utf-8')
    )

def decode_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise ExpiredTokenError()
    except Exception:
        raise InvalidTokenError()

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: Annotated[AsyncSession, Depends(get_db)]):
    if await is_blacklisted(token):
        raise InvalidTokenError()
    
    payload = decode_token(token)

    if payload.get("type") != "access":
        raise InvalidTokenError()

    user_id = payload.get("user_id")

    if not user_id:
        logger.warning(f"Invalid token, user not found: {user_id}")
        raise InvalidTokenError()

    service = UserRepository(db)

    user = await service.get_by_id(user_id)

    if not user:
        logger.warning(f"Invalid token, user not found: {user_id}")
        raise InvalidTokenError()
    
    return user
