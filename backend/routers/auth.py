from fastapi import APIRouter, Depends
from schemas.auth_schemas import UserRegister, RefreshTokenRequest, LoginResponse, RefreshTokenOutResponse
from schemas.util_schemas import DetailResponse
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Request
from typing import Annotated
from services.auth_service import AuthService
from models.user import User
from core.security import get_current_user, oauth2_scheme


router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register", response_model=LoginResponse)
async def register_user(user: UserRegister, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    service = AuthService(db)
    return await service.register_user(request, user)

@router.post("/login", response_model=LoginResponse)
async def login_user(request: Request, db: Annotated[AsyncSession, Depends(get_db)], form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    service = AuthService(db)
    return await service.login_user(request, form_data)

@router.post("/refresh", response_model=RefreshTokenOutResponse)
async def refresh_token(data: RefreshTokenRequest, db: Annotated[AsyncSession, Depends(get_db)]):
    service = AuthService(db)
    return await service.refresh_token(data)

@router.get("/check", response_model=DetailResponse)
async def check_avalability(current_user: Annotated[User, Depends(get_current_user)]):
    return {"detail": "OK"}

@router.post("/logout")
async def logout(data: RefreshTokenRequest, 
                 current_user: Annotated[User, Depends(get_current_user)], 
                 token: Annotated[str, Depends(oauth2_scheme)], 
                 db: Annotated[AsyncSession, Depends(get_db)]):
    service = AuthService(db)
    return await service.logout(token, data.refresh_token)
