from fastapi import APIRouter, Depends
from core.security import get_current_user
from models.user import User
from typing import Annotated
from services.tag_service import TagService
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_db
from repositories.tag_repository import TagRepository
from schemas.tag_schemas import TagCreate, TagOutWResponse, TagOut
from schemas.util_schemas import DetailResponse


router = APIRouter(prefix="/api/tags", tags=["Tags"])

@router.post("/", response_model=TagOutWResponse)
async def create_tag(tag: TagCreate, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = TagService(db)
    return await service.create_tag(tag, current_user)

@router.get("/me", response_model=list[TagOut])
async def get_user_tags(current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = TagRepository(db)
    return await service.get_user_tags(current_user.id)

@router.put("/{tag_id}", response_model=TagOutWResponse)
async def update_tag(tag_id: int, tag: TagCreate, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = TagService(db)
    return await service.update_tag(tag_id, tag, current_user)

@router.delete("/{tag_id}", response_model=DetailResponse)
async def delete_tag(tag_id: int, current_user: Annotated[User, Depends(get_current_user)], db: Annotated[AsyncSession, Depends(get_db)]):
    service = TagService(db)
    return await service.delete_tag(tag_id, current_user)
