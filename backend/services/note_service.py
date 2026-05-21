from sqlalchemy.ext.asyncio import AsyncSession
from repositories.note_repository import NoteRepository
from schemas.note_schemas import NoteFinalize, NoteShortResponse
from models.user import User
from models.note import Note
from fastapi import HTTPException
from core.exceptions import NoteNotFound, PermissionDeniedError
from datetime import datetime


class NoteService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NoteRepository(db)

    async def get_by_id_or_raise(self, note_id: int):
        note = await self.repo.get_by_id(note_id)
        if not note:
            raise NoteNotFound()
        return note
    
    async def get_by_id_my(self, note_id: int, user_id: int):
        note = await self.get_by_id_or_raise(note_id)
        if note.user_id != user_id:
            raise PermissionDeniedError()

        return note
    
    async def create_empty_note(self, user_id: int) -> Note:
        count = await self.repo.get_unnamed_count(user_id)

        if count == 0:
            default_title = "Без названия"
        else:
            default_title = f"Без названия {count}"

        new_note = Note(
            user_id=user_id,
            title=default_title,
            content=""
        )
        
        self.db.add(new_note)
        await self.db.flush()
        await self.db.refresh(new_note)
        
        return new_note
    
    async def finalize_note(self, note_id: int, user_id: int, note_data: NoteFinalize) -> Note | None:
        note = await self.get_by_id_my(note_id, user_id)

        title = note_data.title.strip() if note_data.title else ""
        content = note_data.content.strip() if note_data.content else ""

        if not title and not content:
            await self.db.delete(note)
            await self.db.flush()
            return None

        if title:
            note.title = title

        note.content = content

        await self.db.flush()
        await self.db.refresh(note)
    
        return note
    
    async def get_my_notes(self, user_id: int, 
                        limit: int, 
                        cursor_updated_at: datetime | None = None, 
                        cursor_id: int | None = None,
                        archived: bool = False):
        if (cursor_updated_at is None) != (cursor_id is None):
            raise HTTPException(
                status_code=400,
                detail="cursor_updated_at and cursor_id must be provided together"
            )

        if archived:
            notes_desc = await self.repo.get_my_notes(user_id, limit, cursor_updated_at, cursor_id, archived=True)
        else:
            notes_desc = await self.repo.get_my_notes(user_id, limit, cursor_updated_at, cursor_id)
        
        has_more = len(notes_desc) > limit
        items = notes_desc[:limit]

        next_cursor = None
        if has_more and items:
            oldest_item = items[-1]
            next_cursor = {
                "updated_at": oldest_item.updated_at,
                "id": oldest_item.id
            }

        return {
            "items": items,
            "limit": limit,
            "next_cursor": next_cursor,
            "has_more": has_more
        }
    
    async def reorder_pinned_notes(self, user_id: int, ordered_ids: list[int]):
        pinned_notes = await self.repo.get_pinned_notes(user_id)
        notes_map = {note.id: note for note in pinned_notes}
        
        for note_id in ordered_ids:
            if note_id not in notes_map:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Note with ID {note_id} not found"
                )
        
        for index, note_id in enumerate(ordered_ids):
            note = notes_map[note_id]
            note.pinned_position = index
            
        await self.repo.db.flush()

        return await self.repo.get_pinned_notes(user_id)

    async def toggle_pin_note(self, user_id: int, note_id: int):
        note = await self.get_by_id_my(note_id, user_id)

        note.is_pinned = not note.is_pinned

        if note.is_pinned:
            min_position = await self.repo.get_my_min_pinned_position(user_id)
            
            if min_position is not None:
                note.pinned_position = min_position - 1
            else:
                note.pinned_position = 0
        else:
            note.pinned_position = None

        await self.repo.db.flush()
        await self.repo.db.refresh(note)
        
        return note
