# Dev stack notes

Two database dialects ship with the platform and the code paths through both have caught us out enough times to be worth writing down.

| | Local dev | Production |
|---|---|---|
| Database | SQLite, file at `alldata.db` | Postgres |
| Migrations | none — the `import_seed` self-heal handles every column add | none — same self-heal |
| Search ranking | `LIKE` + position-based ranking | `pg_trgm.similarity()` |
| JSON columns | stored as `TEXT`; SQLAlchemy `JSON` type round-trips | stored as `JSONB` natively |
| Boolean defaults | `0` / `1` literals | `false` / `true` literals (`0` / `1` also accepted) |

The "no migrations" ergonomic is non-negotiable for the seed-driven authoring loop — but it means every new column has to land cleanly via `ALTER TABLE ADD COLUMN`, which SQLite is strict about. The pattern is:

1. Add the column to the SQLAlchemy model in `backend/models/`.
2. Specify a `server_default=` for any `NOT NULL` column. SQLite rejects `ALTER ADD COLUMN ... NOT NULL` without a default.
3. For JSON columns specifically, use `server_default="'{}'"` (the inner single quotes make it a valid SQL string literal on SQLite). The self-heal also auto-quotes a bare `"{}"` for forgiveness, but explicit beats implicit.
4. Run `python -m seed.import_seed` once. The self-heal walks every mapped table, finds the missing column, and issues the ALTER. Repeat-safe.
5. If the column needs to backfill from existing data, do it in a one-off Python script — *not* in the self-heal. The self-heal is for the structural change only.

## Where the dialects diverged historically

- **J3** — first time we hit it: dataset paths assumed Unix forward slashes; the importer's filesystem reads broke on Windows.
- **L4** — search endpoint: pg_trgm doesn't exist on SQLite, so the search needed a portable fallback. The portable path is `LIKE` ranked by where the match lands in the title (prefix > word-boundary > anywhere).
- **M1** — JSON columns: SQLite stores them as TEXT. SQLAlchemy's `JSON` type compiles to `JSON` in DDL on both dialects, but the DEFAULT clause syntax differs. The self-heal had to learn that `DEFAULT {}` is invalid and `DEFAULT '{}'` is what every dialect wants.

## Adding a new column — checklist

1. Declare on the model. Include `server_default=` if `NOT NULL`.
2. Run `python -m seed.import_seed` in your dev environment.
3. Watch for the self-heal log line: `Self-heal: adding column {table}.{col} ({type} DEFAULT …)`.
4. Smoke-test a write to the new column — even just an upsert — to confirm the DEFAULT clause is valid SQL for both dialects (the self-heal will fail loudly on SQLite if it isn't; Postgres won't catch the same error until first write).
5. If the column is part of an API surface, add it to the matching Pydantic schema in `backend/schemas/` and the matching TypeScript type in `frontend/src/api/client.ts`.

## Things that work on Postgres but not SQLite

- `pg_trgm.similarity()` — fuzzy text search. Use the L4 portable wrapper in `backend/services/graph_engine.py:search_graph_nodes` if you need search elsewhere.
- Native JSON operators (`->`, `->>`, `@>`). SQLAlchemy's `JSON` type round-trips dicts on both, so for most CRUD you're fine; reach for raw operators only when you need server-side JSON filtering, and add a SQLite fallback path.
- `DISTINCT ON` and array types. We don't use them today; if you need them, plan the SQLite fallback first.

## Things that work on SQLite but not (cleanly) on Postgres

- `INSERT OR REPLACE`. Use `INSERT ... ON CONFLICT ... DO UPDATE` everywhere; it works on both.
- `PRAGMA`s. Postgres doesn't have them; use `SET` if you need a session-scoped config.

## Why we don't use a migration framework

Alembic is the obvious candidate. We don't use it because:

1. The seed import is the source of truth for content; it runs every time anyway.
2. Self-heal handles column adds; it's strictly less ceremony than `alembic revision --autogenerate`.
3. We don't have to coordinate migrations across a team — there's one author.
4. The cost we pay is: column *removals* and *renames* aren't automatic. Today we handle them by hand (DROP COLUMN on SQLite, an explicit `ALTER` on Postgres) on the rare occasion they come up. If/when the team grows past one, Alembic comes back on the table.
