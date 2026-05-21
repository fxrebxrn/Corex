from sqlalchemy.ext.asyncio import AsyncSession
from repositories.note_repository import NoteRepository
from schemas.note_schemas import NoteFinalize
from models.user import User
from models.note import Note
from fastapi import HTTPException
from core.exceptions import NoteNotFound, PermissionDeniedError


class NoteService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = NoteRepository(db)

    async def get_by_id_or_raise(self, note_id: int):
        note = await self.repo.get_by_id(note_id)
        if not note:
            raise NoteNotFound()
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
        note = await self.get_by_id_or_raise(note_id)

        if note.user_id != user_id:
            raise PermissionDeniedError()

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
