from sqlalchemy.ext.asyncio import AsyncSession
from utils.query_helpers import fetch_first_by_stmt, fetch_all_by_stmt, get_scalar_result
from models.tag import Tag
from models.note import Note
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload


class NoteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, note_id: int):
        stmt = select(Note).where(Note.id == note_id).options(selectinload(Note.tags), selectinload(Note.user))
        return await fetch_first_by_stmt(self.db, stmt)

    async def get_unnamed_count(self, user_id: int):
        stmt = select(func.count(Note.id)).where(Note.user_id == user_id, Note.title.ilike("Без названия%"))
        return await get_scalar_result(self.db, stmt) or 0
