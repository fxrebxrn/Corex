from sqlalchemy.ext.asyncio import AsyncSession
from utils.query_helpers import fetch_first_by_stmt, fetch_all_by_stmt, get_scalar_result
from models.note import Note
from models.tag import NoteTag, Tag
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from datetime import datetime


class NoteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, note_id: int):
        stmt = select(Note).where(Note.id == note_id).options(selectinload(Note.tags), selectinload(Note.user))
        return await fetch_first_by_stmt(self.db, stmt)

    async def get_unnamed_count(self, user_id: int):
        stmt = select(func.count(Note.id)).where(Note.user_id == user_id, Note.title.ilike("Unnamed%"))
        return await get_scalar_result(self.db, stmt) or 0
    
    async def get_notes_count(self, user_id: int):
        stmt = select(func.count(Note.id)).where(Note.user_id == user_id)
        return await get_scalar_result(self.db, stmt)

    async def get_archived_notes_count(self, user_id: int):
        stmt = select(func.count(Note.id)).where(Note.user_id == user_id, Note.is_archived == True)
        return await get_scalar_result(self.db, stmt)
    
    async def get_my_notes(self, user_id: int, limit: int, 
                        cursor_updated_at: datetime | None = None, 
                        cursor_id: int | None = None,
                        archived: bool = False):
        if archived:
            where_clause = [Note.user_id == user_id, Note.is_archived == True]
        else:
            where_clause = [Note.user_id == user_id, Note.is_pinned == False, Note.is_archived == False]

        stmt = (
            select(Note)
            .options(selectinload(Note.tags), selectinload(Note.user))
            .where(*where_clause)
            .order_by(Note.updated_at.desc(), Note.id.desc())
            .limit(limit + 1)
        )
        
        if cursor_updated_at is not None and cursor_id is not None:
            stmt = stmt.where(
                or_(
                    Note.updated_at < cursor_updated_at,
                    and_(
                        Note.updated_at == cursor_updated_at,
                        Note.id < cursor_id
                    )
                )
            )

        return await fetch_all_by_stmt(self.db, stmt)

    async def get_pinned_notes(self, user_id: int):
        stmt = select(Note).options(selectinload(Note.tags), selectinload(Note.user)).where(Note.user_id == user_id, Note.is_pinned == True, Note.is_archived == False).order_by(Note.pinned_position.asc(), Note.id.desc())
        return await fetch_all_by_stmt(self.db, stmt)
    
    async def get_my_min_pinned_position(self, user_id: int) -> int | None:
        stmt = (
            select(func.min(Note.pinned_position))
            .where(Note.user_id == user_id, Note.is_pinned == True))
        return await get_scalar_result(self.db, stmt)
    
    async def get_by_id_public(self, note_id: int):
        stmt = select(Note).where(Note.id == note_id, Note.is_public == True).options(selectinload(Note.tags), selectinload(Note.user))
        return await fetch_first_by_stmt(self.db, stmt)
    
    async def search_notes(self, user_id: int, search_query: str, limit: int, 
                        cursor_updated_at: datetime | None = None, 
                        cursor_id: int | None = None):
        
        like_filter = f"%{search_query}%"
        
        stmt = (
            select(Note)
            .options(selectinload(Note.tags))
            .where(
                Note.user_id == user_id,
                or_(
                    Note.title.ilike(like_filter),
                    Note.content.ilike(like_filter)
                )
            )
            .order_by(Note.updated_at.desc(), Note.id.desc())
            .limit(limit + 1)
        )
        
        if cursor_updated_at is not None and cursor_id is not None:
            stmt = stmt.where(
                or_(
                    Note.updated_at < cursor_updated_at,
                    and_(
                        Note.updated_at == cursor_updated_at,
                        Note.id < cursor_id
                    )
                )
            )

        return await fetch_all_by_stmt(self.db, stmt)
    
    async def get_tag_note(self, note_id: int, tag_id: int):
        stmt = select(NoteTag).where(NoteTag.note_id == note_id, NoteTag.tag_id == tag_id)
        return await fetch_first_by_stmt(self.db, stmt)
    
    async def get_user_tags_by_ids(self, user_id: int, tag_ids: list[int]) -> list[Tag]:
        if not tag_ids:
            return []
        
        stmt = select(Tag).where(Tag.id.in_(tag_ids), Tag.user_id == user_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
