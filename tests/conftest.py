"""Test configuration — in-memory SQLite for fast tests."""

import asyncio
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.database import Base, get_db
from backend.main import app
from backend.models.user import User, UserRole


# Use SQLite for tests (no PostgreSQL dependency)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create tables before each test, drop after."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client with DB dependency override."""

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db: AsyncSession) -> User:
    """Create a test user."""
    from passlib.context import CryptContext
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

    user = User(
        email="test@example.com",
        display_name="Test User",
        hashed_password=pwd.hash("testpass123"),
        role=UserRole.ADMIN.value,
    )
    db.add(user)
    await db.flush()
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict[str, str]:
    """Generate auth headers for the test user."""
    from jose import jwt
    from backend.config import settings

    token = jwt.encode(
        {"sub": str(test_user.id)},
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    return {"Authorization": f"Bearer {token}"}
