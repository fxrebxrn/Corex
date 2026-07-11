from fastapi import APIRouter, Depends
from schemas.user_schemas import UserProfileResponse, UserProfileWDetailResponse, UpdateUser, EmailWDetailResponse
from core.security import get_current_user
from models.user import User
from typing import Annotated
from services.user_service import UserService
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from schemas.note_schemas import NoteShortResponse
from schemas.util_schemas import DetailResponse


router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = UserService(db)
    return await service.get_profile_by_username(current_user.username)

@router.get("/check/{username}", response_model=DetailResponse)
async def check_avalability(username: str, db: Annotated[AsyncSession, Depends(get_db)]):
    service = UserService(db)
    return await service.check_availability(username)

@router.get("/{username}/notes", response_model=list[NoteShortResponse])
async def get_all_user_notes(username: str, db: Annotated[AsyncSession, Depends(get_db)]):
    service = UserService(db)
    return await service.get_all_user_notes(username)

@router.patch("/me/email", response_model=EmailWDetailResponse)
async def update_user_email(current_user: Annotated[User, Depends(get_current_user)], email: str, db: Annotated[AsyncSession, Depends(get_db)]):
    service = UserService(db)
    return await service.update_user_email(current_user, email)

@router.put("/me", response_model=UserProfileWDetailResponse)
async def update_user_profile(current_user: Annotated[User, Depends(get_current_user)], user: UpdateUser, db: Annotated[AsyncSession, Depends(get_db)]):
    service = UserService(db)
    return await service.update_user_profile(current_user, user)
