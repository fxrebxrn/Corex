from fastapi import APIRouter, Depends
from core.security import get_current_user
from models.user import User
from typing import Annotated
from services.note_service import NoteService
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from schemas.note_schemas import NoteResponse, NoteFinalize, NoteShortResponse
from schemas.util_schemas import DetailResponse
from fastapi import Response
from starlette import status


router = APIRouter(prefix="/api/notes", tags=["Notes"])

@router.post("/", response_model=NoteResponse)
async def create_empty_note(current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    return await service.create_empty_note(current_user.id)

@router.put("/{note_id}/finalize", response_model=NoteResponse | None)
async def finalize_note(note_id: int, note_data: NoteFinalize, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = NoteService(db)
    result = await service.finalize_note(note_id, current_user.id, note_data)
    
    if result is None: 
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    return result
