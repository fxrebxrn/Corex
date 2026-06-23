from sqlalchemy.ext.asyncio import AsyncSession
from repositories.tag_repository import TagRepository
from schemas.tag_schemas import TagCreate
from models.user import User
from models.tag import Tag
from fastapi import HTTPException
from core.exceptions import TagNotFound, PermissionDeniedError
from config.settings import settings


class TagService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TagRepository(db)

    async def get_by_id_or_raise(self, tag_id: int):
        tag = await self.repo.get_by_id(tag_id)

        if not tag:
            raise TagNotFound()

        return tag

    async def get_by_id_my(self, tag_id: int, user_id: int):
        tag = await self.get_by_id_or_raise(tag_id)

        if tag.user_id != user_id:
            raise PermissionDeniedError()

        return tag

    async def create_tag(self, tag: TagCreate, current_user: User):
        exists = await self.repo.get_user_tag_by_name(tag.name, current_user.id)
        if exists:
            raise HTTPException(status_code=400, detail="Tag already exists")

        tags_count = await self.repo.get_user_tags_count(current_user.id)
        if tags_count >= settings.MAX_TAGS_COUNT:
            raise HTTPException(status_code=400, detail="You have reached the maximum number of tags")
        
        new_tag = Tag(
            name=tag.name,
            user_id=current_user.id,
        )

        self.db.add(new_tag)
        await self.db.flush()
        await self.db.refresh(new_tag)

        return {
            "detail": "Tag created successfully",
            "tag": new_tag
        }

    async def update_tag(self, tag_id: int, tag: TagCreate, current_user: User):
        tag_to_update = await self.get_by_id_or_raise(tag_id)

        if tag_to_update.user_id != current_user.id:
            raise PermissionDeniedError()

        if tag.name != tag_to_update.name and await self.repo.get_user_tag_by_name(tag.name, current_user.id):
            raise HTTPException(status_code=400, detail="Tag already exists")

        tag_to_update.name = tag.name

        await self.db.flush()
        await self.db.refresh(tag_to_update)

        return {
            "detail": "Tag updated successfully",
            "tag": tag_to_update
        }
    
    async def delete_tag(self, tag_id: int, current_user: User):
        tag_to_delete = await self.get_by_id_or_raise(tag_id)

        if tag_to_delete.user_id != current_user.id:
            raise PermissionDeniedError()

        await self.db.delete(tag_to_delete)
        await self.db.flush()

        return {
            "detail": "Tag deleted successfully"
        }
