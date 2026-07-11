from datetime import datetime, timezone
from core.redis_client import redis_client


async def add_to_blacklist(token: str, exp: int):
    now = int(datetime.now(timezone.utc).timestamp())
    ttl = exp - now
    if ttl > 0:
        await redis_client.setex(f"blacklist:{token}", ttl, "1")

async def is_blacklisted(token: str) -> bool:
    result = await redis_client.get(f"blacklist:{token}")
    return result is not None
