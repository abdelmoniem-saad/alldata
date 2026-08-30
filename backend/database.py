import logging

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings

logger = logging.getLogger("alldata")


def _asyncpg_ssl(sslmode: str):
    """Translate a libpq-style `sslmode` URL param into asyncpg's `ssl` arg.

    SQLAlchemy hands URL query params to asyncpg.connect() as individual
    kwargs, and asyncpg has no `sslmode` kwarg (it only understands sslmode
    inside a DSN string, which SQLAlchemy doesn't send) — it accepts an
    `ssl` argument instead. Without this translation every connection dies
    with `TypeError: connect() got an unexpected keyword argument 'sslmode'`.

    Semantics follow libpq:
    - `disable` → no TLS (asyncpg accepts False)
    - `require` → encryption, no certificate verification (the libpq meaning)
    - `verify-ca` / `verify-full` → default verification (chain + hostname)
    """
    import ssl

    mode = sslmode.strip().lower()
    if mode == "disable":
        return False
    ctx = ssl.create_default_context()
    if mode == "require":
        # libpq 'require': encrypt, don't verify the certificate chain.
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    # verify-ca / verify-full keep the default verified context.
    return ctx


# Query params that SQLAlchemy would forward to asyncpg.connect() as kwargs
# but that asyncpg doesn't accept (channel_binding would be silently forwarded
# to the *server* as a setting by raw DSN parsing; through SQLAlchemy it hits
# connect() as an unknown kwarg and raises TypeError). Both are removed; a
# warning is logged so the operator knows their URL was adjusted.
_UNSUPPORTED_QUERY_PARAMS = ("sslmode", "channel_binding")


def _engine_setup(database_url: str) -> tuple[object, dict]:
    """Build (url, engine_kwargs) for create_async_engine.

    Returns the (possibly adjusted) URL and pooling/connect kwargs. SQLite
    keeps the plain engine; Postgres gets pooling sizing plus the sslmode
    translation above.
    """
    kwargs: dict = {"echo": False}
    url = make_url(database_url)
    if url.drivername.startswith("sqlite"):
        return url, kwargs

    kwargs.update({"pool_size": 20, "max_overflow": 10})

    query = dict(url.query)
    sslmode = query.pop("sslmode", None)
    for param in _UNSUPPORTED_QUERY_PARAMS:
        if param == "sslmode":
            continue
        if param in query:
            query.pop(param)
            logger.warning(
                "DATABASE_URL contained %s=... — asyncpg does not support it; "
                "dropping it from the connection URL.", param,
            )
    if sslmode is not None:
        if url.get_driver_name() == "asyncpg":
            kwargs["connect_args"] = {"ssl": _asyncpg_ssl(str(sslmode))}
        else:
            # sync psycopg dialects understand sslmode natively; leave it.
            query["sslmode"] = sslmode
    return url.set(query=query), kwargs


_database_url, engine_kwargs = _engine_setup(settings.database_url)

engine = create_async_engine(_database_url, **engine_kwargs)

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
