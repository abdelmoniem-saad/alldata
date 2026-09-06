"""C1 hotfix: the self-heal's ALTER statements must be dialect-correct.

The `terminal` column shipped `DEFAULT 0` for a BOOLEAN column, which
SQLite accepts and Postgres rejects (DatatypeMismatchError) — the live
Space failed its boot three times until the default was normalized per
dialect. These tests pin that behavior so the next Boolean column can't
regress it.
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql, sqlite

from seed.import_seed import _bool_default_for


def test_boolean_default_is_dialect_correct():
    assert _bool_default_for(True) == " DEFAULT FALSE"
    assert _bool_default_for(False) == " DEFAULT 0"


def _heal_ddl_for_boolean(dialect) -> str:
    """Rebuild the exact ALTER the self-heal emits for a Boolean column
    with the model's `server_default="0"`, running the same normalization
    branch `_self_heal_columns` runs."""
    md = sa.MetaData()
    sa.Table(
        "t", md,
        sa.Column("flag", sa.Boolean(), nullable=False, server_default="0"),
    )
    col = md.tables["t"].c.flag
    col_type = col.type.compile(dialect=dialect)
    default_clause = " DEFAULT 0"  # what the raw server_default produced
    if "BOOL" in col_type.upper() and default_clause:
        from seed.import_seed import _bool_default_for
        default_clause = _bool_default_for(dialect.name == "postgresql")
    return f"ALTER TABLE t ADD COLUMN flag {col_type} NOT NULL{default_clause}"


def test_postgres_boolean_ddl_has_no_integer_default():
    ddl = _heal_ddl_for_boolean(postgresql.dialect())
    assert ddl == "ALTER TABLE t ADD COLUMN flag BOOLEAN NOT NULL DEFAULT FALSE"


def test_sqlite_boolean_ddl_keeps_zero_default():
    ddl = _heal_ddl_for_boolean(sqlite.dialect())
    assert ddl == "ALTER TABLE t ADD COLUMN flag BOOLEAN NOT NULL DEFAULT 0"
