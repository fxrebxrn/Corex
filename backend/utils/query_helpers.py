from sqlalchemy.ext.asyncio import AsyncSession
from core.exceptions import NotFoundError


async def fetch_all_by_stmt(db: AsyncSession, stmt):
    result = await db.execute(stmt)
    return result.scalars().all()

async def fetch_first_by_stmt(db: AsyncSession, stmt):
    result = await db.execute(stmt)
    return result.scalars().first()

async def get_scalar_result(db: AsyncSession, stmt):
    result = await db.execute(stmt)
    return result.scalar()
