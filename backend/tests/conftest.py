import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.database import get_db
from core.security import get_current_user, hash_password
from models.base import Base
from models.note import Note  # noqa: F401
from models.tag import Tag, NoteTag  # noqa: F401
from models.user import User  # noqa: F401
from main import app


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest.fixture(autouse=True)
def disable_redis(monkeypatch):
    async def _noop(*args, **kwargs):
        return None

    async def _false(*args, **kwargs):
        return False

    monkeypatch.setattr("services.auth_service.check_rate_limit", _noop)
    monkeypatch.setattr("services.auth_service.add_failed_attempt", _noop)
    monkeypatch.setattr("services.auth_service.reset_failed_attempts", _noop)
    monkeypatch.setattr("services.auth_service.add_to_blacklist", _noop)
    monkeypatch.setattr("services.auth_service.is_blacklisted", _false)
    monkeypatch.setattr("utils.rate_limit.check_rate_limit", _noop)
    monkeypatch.setattr("utils.rate_limit.add_failed_attempt", _noop)
    monkeypatch.setattr("utils.rate_limit.reset_failed_attempts", _noop)


@pytest.fixture
async def client(session):
    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture
def auth_override():
    def _set(user: User):
        async def override_get_current_user():
            return user

        app.dependency_overrides[get_current_user] = override_get_current_user

    yield _set
    app.dependency_overrides.pop(get_current_user, None)


async def create_user(session: AsyncSession, *, username: str, email: str, password: str = "Password123") -> User:
    user = User(
        name="Test User",
        email=email,
        username=username,
        hashed_password=hash_password(password),
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return user
