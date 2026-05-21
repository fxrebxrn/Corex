from sqlalchemy.ext.asyncio import AsyncSession
from utils.query_helpers import fetch_first_by_stmt, fetch_all_by_stmt, get_scalar_result
from models.user import User
from models.note import Note
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: int):
        stmt = select(User).where(User.id == user_id)
        return await fetch_first_by_stmt(self.db, stmt)

    async def get_user_by_email(self, email: str):
        stmt = select(User).where(User.email == email)
        return await fetch_first_by_stmt(self.db, stmt)
    
    async def search_user_by_letters(self, name: str, limit: int, offset: int):
        stmt = select(User).where(User.name.ilike(f"%{name}%")).limit(limit).offset(offset)
        return await fetch_all_by_stmt(self.db, stmt)

    async def get_user_by_login(self, login: str):
        stmt = select(User).where(or_(User.username == login, User.email == login))
        return await fetch_first_by_stmt(self.db, stmt)

    async def get_by_username(self, username: str):
        stmt = select(User).where(User.username == username)
        return await fetch_first_by_stmt(self.db, stmt)
    