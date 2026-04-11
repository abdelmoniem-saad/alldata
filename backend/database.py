from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings

engine_kwargs = {"echo": False}

# SQLite does not support the same pooling options used for Postgres.
if not settings.database_url.startswith("sqlite"):
    engine_kwargs.update({"pool_size": 20, "max_overflow": 10})

engine = create_async_engine(settings.database_url, **engine_kwargs)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
