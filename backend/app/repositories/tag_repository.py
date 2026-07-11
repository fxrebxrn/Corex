from sqlalchemy.ext.asyncio import AsyncSession
from utils.query_helpers import fetch_first_by_stmt, fetch_all_by_stmt, get_scalar_result
from models.tag import Tag
from models.note import Note
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload


class TagRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_tag_by_name(self, name: str, user_id: int):
        stmt = select(Tag).where(Tag.name == name, Tag.user_id == user_id)
        return await fetch_first_by_stmt(self.db, stmt)

    async def get_user_tags(self, user_id: int):
        stmt = select(Tag).where(Tag.user_id == user_id).order_by(Tag.name.asc())
        return await fetch_all_by_stmt(self.db, stmt)

    async def get_user_tags_count(self, user_id: int):
        stmt = select(func.count(Tag.id)).where(Tag.user_id == user_id)
        return await get_scalar_result(self.db, stmt)
    
    async def get_by_id(self, tag_id: int):
        stmt = select(Tag).where(Tag.id == tag_id)
        return await fetch_first_by_stmt(self.db, stmt)
