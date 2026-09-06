"""DATABASE_URL normalization.

The refresh command (and any operator tooling) accepts whatever connection
string the dashboard hands over. These pin the two translations that make
that possible: libpq-style driver names upgrade to asyncpg, and sslmode
becomes an asyncpg `ssl` connect arg instead of a fatal kwarg.
"""

from backend.database import _engine_setup


def test_plain_postgres_url_upgrades_to_asyncpg():
    url, kwargs = _engine_setup("postgresql://u:p@h/db?sslmode=require")
    assert url.drivername == "postgresql+asyncpg"
    # sslmode was consumed into connect_args, not forwarded to asyncpg.
    assert "sslmode" not in dict(url.query)
    assert "ssl" in kwargs.get("connect_args", {})


def test_legacy_postgres_scheme_also_upgrades():
    url, _ = _engine_setup("postgres://u:p@h/db?sslmode=require")
    assert url.drivername == "postgresql+asyncpg"


def test_explicit_asyncpg_url_unchanged():
    url, kwargs = _engine_setup("postgresql+asyncpg://u:p@h/db?sslmode=require")
    assert url.drivername == "postgresql+asyncpg"
    assert "ssl" in kwargs.get("connect_args", {})


def test_sqlite_url_untouched():
    url, kwargs = _engine_setup("sqlite+aiosqlite:///./alldata.db")
    assert url.drivername == "sqlite+aiosqlite"
    assert "connect_args" not in kwargs
