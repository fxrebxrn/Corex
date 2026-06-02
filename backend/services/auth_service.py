from sqlalchemy.ext.asyncio import AsyncSession
from schemas.auth_schemas import UserRegister
from core.security import hash_password, without_at_prefix, verify_password, create_access_token, create_refresh_token, decode_token
from fastapi import HTTPException, Request
from models.user import User
from repositories.user_repository import UserRepository
from fastapi.security import OAuth2PasswordRequestForm
from utils.rate_limit import check_rate_limit, add_failed_attempt, reset_failed_attempts
from core.exceptions import InvalidTokenError, ExpiredTokenError
from schemas.auth_schemas import RefreshTokenRequest
from core.redis_blacklist import add_to_blacklist, is_blacklisted


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register_user(self, request: Request, user: UserRegister):
        ip = request.client.host
        key = f"failed_registration:{ip}"
        
        existing_user = await self.user_repo.get_user_by_email(user.email)
        if existing_user:
            await add_failed_attempt(key, window=60)
            await check_rate_limit(key, limit=5)
            raise HTTPException(status_code=400, detail="Email already exists")
        
        await reset_failed_attempts(key)
        
        hashed_password = hash_password(user.password)

        normal_username = without_at_prefix(user.username)
        
        existing_user = await self.user_repo.get_by_username(normal_username)
        if existing_user:
            await add_failed_attempt(key, window=60)
            await check_rate_limit(key, limit=5)
            raise HTTPException(status_code=400, detail="Username already exists")
        
        await reset_failed_attempts(key)
        
        new_user = User(
            name=user.name,
            email=user.email,
            username=normal_username,
            hashed_password=hashed_password
        )
        
        self.db.add(new_user)
        await self.db.flush()
        await self.db.refresh(new_user)
        
        access_token = create_access_token({"user_id": new_user.id})
        refresh_token = create_refresh_token({"user_id": new_user.id})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": new_user
        }

    async def login_user(self, request: Request, form_data: OAuth2PasswordRequestForm):
        normal_username = without_at_prefix(form_data.username)
        
        login = normal_username
        password = form_data.password
        
        ip = request.client.host
        key = f"failed_login:{ip}:{login}"
        await check_rate_limit(key, limit=5)

        user_to_login = await self.user_repo.get_user_by_login(login)

        if not user_to_login:
            await add_failed_attempt(key, window=60)
            raise HTTPException(status_code=401, detail="Incorrect credentials")

        if not verify_password(password, user_to_login.hashed_password):
            await add_failed_attempt(key, window=60)
            raise HTTPException(status_code=401, detail="Incorrect credentials")
        
        await reset_failed_attempts(key)

        access_token = create_access_token({"user_id": user_to_login.id})
        refresh_token = create_refresh_token({"user_id": user_to_login.id})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user_to_login
        }

    async def refresh_token(self, data: RefreshTokenRequest, token: str):
        if await is_blacklisted(data.refresh_token):
            raise InvalidTokenError()
        
        payload_refresh = decode_token(data.refresh_token)
        
        if payload_refresh.get("type") != "refresh":
            raise InvalidTokenError()
        
        user_id = payload_refresh.get("user_id")
        if not user_id:
            raise InvalidTokenError()
        
        try:
            payload_access = decode_token(token)
            if payload_access.get("type") != "access":
                raise InvalidTokenError()
            await add_to_blacklist(token, payload_access.get("exp"))
        except ExpiredTokenError:
            pass 
        
        new_access_token = create_access_token({"user_id": user_id})
        new_refresh_token = create_refresh_token({"user_id": user_id})
        
        await add_to_blacklist(data.refresh_token, payload_refresh.get("exp"))
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }

    async def logout(self, access_token: str, refresh_token: str):
        access_payload = decode_token(access_token)
        if access_payload.get("type") != "access":
            raise InvalidTokenError()
        
        refresh_payload = decode_token(refresh_token)
        if refresh_payload.get("type") != "refresh":
            raise InvalidTokenError()
        
        await add_to_blacklist(access_token, access_payload.get("exp"))
        await add_to_blacklist(refresh_token, refresh_payload.get("exp"))
        
        return {"detail": "Successfully logged out"}
    