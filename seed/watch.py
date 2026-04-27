"""seed.watch — author dev loop for the I plan.

Run with:

    python -m seed.watch

Watches `seed/topics/**/{*.md, meta.yaml}` and re-imports the changed topic on
save. Keeps the "edit md, see it reflected" loop fast — the user's stated
authoring ergonomic this cycle has to preserve.

Implementation notes
--------------------
- A whole-DB reimport via `seed.import_seed.main` would work but takes seconds
  per save and clobbers user progress. Instead we surgically reimport just the
  one topic that changed by calling the same `import_topic_content` helpers
  used by `import_schema` — that's the single-topic entry point in the
  importer.
- Debounce: editors often fire multiple FS events per save (rename + write).
  We coalesce events within 200ms per (topic_dir) so a save reimports once.
- Anchor on `topic_dir`, not the file. A topic = `seed/topics/{domain}/{slug}/`
  containing one or more `.md` and the `meta.yaml`. Any of those changing is
  the same reimport.
- Output is intentionally chatty — author wants visible confirmation that the
  change landed. Errors don't crash the watcher; they're printed and the loop
  continues so a syntax error in a file doesn't kill the session.
"""

import asyncio
import sys
import time
from pathlib import Path
from threading import Lock, Timer

import yaml
from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from backend.database import async_session
from seed import import_seed

# Use the package-level helpers — keeps watch.py decoupled from internal
# refactors of the importer body.
from seed.import_seed import (  # type: ignore[attr-defined]
    create_tables,
    get_or_create_system_user,
    import_schema,
)


SEED_DIR = Path(__file__).parent / "topics"
DEBOUNCE_MS = 200


# ─── Reimport orchestration ────────────────────────────────────────────────


async def _full_reimport() -> None:
    """Run the importer end-to-end. Same as `python -m seed.import_seed`.

    The importer is idempotent — every topic is upserted. We use the full path
    rather than maintaining a parallel single-topic flow so behavior here is
    guaranteed to match production seeding.
    """
    await create_tables()
    async with async_session() as db:
        user = await get_or_create_system_user(db)
        await import_schema(db, user)
        await db.commit()


def _topic_dir_for(path: Path) -> Path | None:
    """Walk up from a changed file to the `topics/{domain}/{slug}/` directory.

    Returns None if the path isn't inside `seed/topics/`.
    """
    try:
        rel = path.resolve().relative_to(SEED_DIR.resolve())
    except ValueError:
        return None
    parts = rel.parts
    # Expect: domain/slug/file or domain/slug/subdir/file. Take first two.
    if len(parts) < 2:
        return None
    return SEED_DIR / parts[0] / parts[1]


# ─── Watcher ───────────────────────────────────────────────────────────────


class _Handler(FileSystemEventHandler):
    """Coalesces FS events per topic dir → single reimport per save."""

    def __init__(self) -> None:
        super().__init__()
        self._lock = Lock()
        self._pending: dict[Path, Timer] = {}

    def _schedule(self, topic_dir: Path) -> None:
        with self._lock:
            existing = self._pending.pop(topic_dir, None)
            if existing:
                existing.cancel()
            t = Timer(DEBOUNCE_MS / 1000, self._fire, args=[topic_dir])
            self._pending[topic_dir] = t
            t.start()

    def _fire(self, topic_dir: Path) -> None:
        with self._lock:
            self._pending.pop(topic_dir, None)
        slug = topic_dir.name
        domain = topic_dir.parent.name
        print(f"\n[watch] {domain}/{slug} changed → reimporting...", flush=True)
        t0 = time.perf_counter()
        try:
            asyncio.run(_full_reimport())
        except yaml.YAMLError as e:
            print(f"[watch] YAML error in {domain}/{slug}: {e}", flush=True)
            return
        except Exception as e:  # noqa: BLE001 — author content can fail in many ways
            print(f"[watch] reimport failed: {e!r}", flush=True)
            return
        dt = (time.perf_counter() - t0) * 1000
        print(f"[watch] reimported in {dt:.0f}ms — refresh the page.", flush=True)

    # ── FS event handlers ──────────────────────────────────────────────────

    def _handle(self, event: FileSystemEvent) -> None:
        if event.is_directory:
            return
        path = Path(event.src_path)
        # Filter to the file types the importer actually reads.
        if path.suffix.lower() not in {".md", ".yaml", ".yml"}:
            return
        topic_dir = _topic_dir_for(path)
        if topic_dir is None:
            return
        self._schedule(topic_dir)

    def on_modified(self, event: FileSystemEvent) -> None:
        self._handle(event)

    def on_created(self, event: FileSystemEvent) -> None:
        self._handle(event)

    def on_moved(self, event: FileSystemEvent) -> None:
        self._handle(event)


def main() -> None:
    if not SEED_DIR.exists():
        print(f"[watch] seed dir not found: {SEED_DIR}", file=sys.stderr)
        sys.exit(1)

    print(f"[watch] watching {SEED_DIR}")
    print("[watch] edit any seed/topics/**/*.md or meta.yaml — saves auto-reimport.")
    print("[watch] Ctrl+C to stop.")

    # First run does a clean-state reimport so the DB matches the seed dir as
    # of right now (catches changes made while the watcher was off).
    print("[watch] initial reimport...", flush=True)
    try:
        asyncio.run(_full_reimport())
        print("[watch] ready.", flush=True)
    except Exception as e:  # noqa: BLE001
        print(f"[watch] initial reimport failed: {e!r}", flush=True)

    observer = Observer()
    handler = _Handler()
    observer.schedule(handler, str(SEED_DIR), recursive=True)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[watch] stopping...")
        observer.stop()
    observer.join()


if __name__ == "__main__":
    main()
