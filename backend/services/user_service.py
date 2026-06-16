from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from core.exceptions import UserNotFound
from models.user import User
from schemas.user_schemas import UpdateUser
from fastapi import HTTPException
from core.security import DECLINED_NAMES
from repositories.note_repository import NoteRepository


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)
        self.note_repo = NoteRepository(db)

    async def _is_username_available(self, username: str) -> bool:
        user = await self.repo.get_by_username(username.strip().lower())
        return user is None

    async def get_by_username_or_raise(self, username: str):
        user = await self.repo.get_by_username(username)

        if not user:
            raise UserNotFound()

        return user
    
    async def get_by_id_or_raise(self, user_id: int):
        user = await self.repo.get_by_id(user_id)

        if not user:
            raise UserNotFound()

        return user
        
    async def get_profile_by_username(self, username: str):
        user = await self.get_by_username_or_raise(username)

        return {
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "notes_count": await self.note_repo.get_notes_count(user.id)
        }
    
    async def get_all_user_notes(self, username: str):
        user = await self.get_by_username_or_raise(username)
        return await self.note_repo.get_user_notes(user.id)
    
    async def update_user_profile(self, current_user: User, user: UpdateUser):
        user_to_update = await self.get_by_id_or_raise(current_user.id)

        if user.username.strip().lower() != current_user.username.strip().lower() and not await self._is_username_available(user.username):
            raise HTTPException(status_code=400, detail="Username already exists")

        user_to_update.name = user.name
        user_to_update.username = user.username

        await self.db.flush()
        await self.db.refresh(user_to_update)

        return {
            "detail": "User updated successfully", 
            "user": user_to_update
            }
    
    async def check_availability(self, username: str):
        response = await self._is_username_available(username)
        
        if username.strip().lower() in DECLINED_NAMES:
            response = False

        return {
            "detail": response
        }

    async def update_user_email(self, current_user: User, email: str):
        if email.strip().lower() == current_user.email.strip().lower():
            raise HTTPException(status_code=400, detail="Email already exists")
        
        user_to_update = await self.get_by_id_or_raise(current_user.id)

        duplicate_email = await self.repo.get_user_by_email(email)
        if duplicate_email and duplicate_email.id != user_to_update.id:
            raise HTTPException(status_code=400, detail="Email already exists")

        user_to_update.email = email

        await self.db.flush()
        await self.db.refresh(user_to_update)

        return {
            "detail": "Email updated successfully", 
            "email": user_to_update.email
            }
