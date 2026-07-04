from fastapi import APIRouter, Depends
from core.security import get_current_user
from models.user import User
from typing import Annotated
from services.note_service import NoteService
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from schemas.note_schemas import NoteResponse, NoteFinalize, PaginatedNotesResponse, NoteShortResponse, ReorderPinnedRequest, SyncNoteTagRequest
from schemas.util_schemas import DetailResponse
from fastapi import Response, Query
from starlette import status
from datetime import datetime


router = APIRouter(prefix="/api/notes", tags=["Notes"])

@router.post("/", response_model=DetailResponse)
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

@router.get("/me/tag/{tag_id}", response_model=PaginatedNotesResponse)
async def get_my_notes(current_user: Annotated[User, Depends(get_current_user)],
                                tag_id: int,
                                db: Annotated[AsyncSession, Depends(get_db)], 
                                limit: int = Query(50, ge=1, le=50),
                                cursor_updated_at: datetime | None = None, 
                                cursor_id: int | None = None):
    service = NoteService(db)
    return await service.get_my_notes_by_tag(current_user.id, tag_id, limit, cursor_updated_at, cursor_id)

@router.get("/me/pinned", response_model=list[NoteShortResponse])
async def get_pinned_notes(current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.get_pinned_notes(current_user.id)

@router.get("/me/archived", response_model=PaginatedNotesResponse)
async def get_archived_notes(current_user: Annotated[User, Depends(get_current_user)],
                                db: Annotated[AsyncSession, Depends(get_db)], 
                                limit: int = Query(50, ge=1, le=50),
                                cursor_updated_at: datetime | None = None, 
                                cursor_id: int | None = None):
    service = NoteService(db)
    return await service.get_my_notes(current_user.id, limit, cursor_updated_at, cursor_id, archived=True)

@router.get("/me/search", response_model=PaginatedNotesResponse)
async def search_my_notes(current_user: Annotated[User, Depends(get_current_user)], 
                          db: Annotated[AsyncSession, Depends(get_db)],
                          q: str = Query(..., min_length=3, alias="query"),
                          limit: int = Query(50, ge=1, le=50),
                          cursor_updated_at: datetime | None = None, 
                          cursor_id: int | None = None):
    service = NoteService(db)
    return await service.search_notes(current_user.id, q, limit, cursor_updated_at, cursor_id)

@router.get("/me/{note_id}", response_model=NoteResponse)
async def get_my_note(note_id: int, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.get_by_id_my(note_id, current_user.id)

@router.get("/public/{note_id}", response_model=NoteResponse)
async def get_public_note(note_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.get_by_id_public(note_id)

@router.patch("/{note_id}/pin", response_model=DetailResponse)
async def toggle_pin_note(note_id: int, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.toggle_pin_note(current_user.id, note_id)

@router.patch("/{note_id}/archive", response_model=DetailResponse)
async def toggle_archive_note(note_id: int, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.toggle_archive_note(current_user.id, note_id)

@router.put("/me/pinned/reorder", response_model=list[NoteShortResponse])
async def reorder_pinned_notes(data: ReorderPinnedRequest, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.reorder_pinned_notes(current_user.id, data.ordered_ids)

@router.put("/{note_id}/finalize", response_model=NoteResponse)
async def finalize_note(note_id: int, note_data: NoteFinalize, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    result = await service.finalize_note(note_id, current_user.id, note_data)
    
    if result is None: 
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    return result

@router.put("/me/{note_id}/tags", response_model=DetailResponse)
async def sync_note_tags(
    note_id: int,
    data: SyncNoteTagRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    service = NoteService(db)
    return await service.sync_note_tags(note_id, current_user.id, data.tag_ids)

@router.delete("/me/{note_id}", response_model=DetailResponse)
async def delete_note(note_id: int, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.delete_note(current_user.id, note_id)
