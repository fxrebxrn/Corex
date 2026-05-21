from fastapi import APIRouter, Depends
from core.security import get_current_user
from models.user import User
from typing import Annotated
from services.note_service import NoteService
from repositories.note_repository import NoteRepository
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from schemas.note_schemas import NoteResponse, NoteFinalize, PaginatedNotesResponse, NoteShortResponse, ReorderPinnedRequest
from schemas.util_schemas import DetailResponse
from fastapi import Response, Query
from starlette import status
from datetime import datetime


router = APIRouter(prefix="/api/notes", tags=["Notes"])

@router.post("/", response_model=NoteResponse)
async def create_empty_note(current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.create_empty_note(current_user.id)

@router.get("/me", response_model=PaginatedNotesResponse)
async def get_my_notes(current_user: Annotated[User, Depends(get_current_user)],
                                db: Annotated[AsyncSession, Depends(get_db)], 
                                limit: int = Query(50, ge=1, le=50),
                                cursor_updated_at: datetime | None = None, 
                                cursor_id: int | None = None):
    service = NoteService(db)
    return await service.get_my_notes(current_user.id, limit, cursor_updated_at, cursor_id)

@router.get("/me/pinned", response_model=list[NoteShortResponse])
async def get_pinned_notes(current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteRepository(db)
    return await service.get_pinned_notes(current_user.id)

@router.get("/me/archived", response_model=PaginatedNotesResponse)
async def get_archived_notes(current_user: Annotated[User, Depends(get_current_user)],
                                db: Annotated[AsyncSession, Depends(get_db)], 
                                limit: int = Query(50, ge=1, le=50),
                                cursor_updated_at: datetime | None = None, 
                                cursor_id: int | None = None):
    service = NoteService(db)
    return await service.get_my_notes(current_user.id, limit, cursor_updated_at, cursor_id, archived=True)

@router.patch("/{note_id}/pin", response_model=NoteShortResponse)
async def toggle_pin_note(note_id: int, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.toggle_pin_note(current_user.id, note_id)

@router.put("/me/pinned/reorder", response_model=list[NoteShortResponse])
async def reorder_pinned_notes(data: ReorderPinnedRequest, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.reorder_pinned_notes(current_user.id, data.ordered_ids)

@router.put("/{note_id}/finalize", response_model=NoteResponse | None)
async def finalize_note(note_id: int, note_data: NoteFinalize, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    result = await service.finalize_note(note_id, current_user.id, note_data)
    
    if result is None: 
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    return result
