"""Fork service — N (fork model).

A fork is a user's editable copy of one topic. This module owns the
persistence operations; the parsing of `markdown_source` into renderable
blocks happens in the API layer (it reuses the seed importer's parser).

The personal-fork contract: one fork per (user, topic). The uniqueness is
enforced application-side in `create_fork` rather than via a DB constraint
— the `course_id`-scoped fork path (legacy, unused) would otherwise need a
partial unique index that SQLite doesn't support cleanly.
"""

import uuid
from pathlib import Path

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.fork import TopicFork
from backend.models.topic import Topic
from backend.models.user import User

# `backend/services/fork_service.py` → project root → `seed/topics`.
_TOPICS_DIR = Path(__file__).resolve().parents[2] / "seed" / "topics"


def _read_topic_source(topic: Topic) -> str:
    """Read a topic's `content.md` off disk to seed a fresh fork.

    Tries `seed/topics/{domain}/{slug}/content.md` first, then falls back to
    a glob in case the DB `domain` and the on-disk directory diverge.
    Returns an empty string when no source file exists (a user-authored
    topic that never came from the seed) — the fork editor handles the
    empty case with a "start writing" affordance.
    """
    if topic.domain:
        direct = _TOPICS_DIR / topic.domain / topic.slug / "content.md"
        if direct.is_file():
            return direct.read_text(encoding="utf-8")
    for candidate in _TOPICS_DIR.glob(f"*/{topic.slug}/content.md"):
        if candidate.is_file():
            return candidate.read_text(encoding="utf-8")
    return ""


async def _resolve_user(db: AsyncSession, username: str) -> User | None:
    """Resolve a username token to a User.

    Same fuzzy match as the K7 snapshot endpoint: case-insensitive on
    `display_name` (dashes/underscores treated as spaces) plus an
    email-local-part shortcut. Keeps `/u/{username}/...` URLs forgiving.
    """
    if not username:
        return None
    norm = username.lower().replace("-", " ").replace("_", " ").strip()
    result = await db.execute(
        select(User).where(
            or_(
                func.lower(User.display_name) == norm,
                func.lower(User.display_name) == username.lower(),
                func.lower(User.email).like(f"{username.lower()}@%"),
            )
        )
    )
    return result.scalars().first()


async def create_fork(
    db: AsyncSession, user_id: uuid.UUID, topic_slug: str
) -> tuple[TopicFork, Topic] | None:
    """Create a personal fork of a topic, seeded from its content.md.

    Returns `(fork, topic)` on success, or `None` when the topic doesn't
    exist. Raises `ForkExistsError` if the user already forked this topic.
    """
    topic_q = await db.execute(select(Topic).where(Topic.slug == topic_slug))
    topic = topic_q.scalar_one_or_none()
    if topic is None:
        return None

    existing_q = await db.execute(
        select(TopicFork).where(
            TopicFork.forked_by == user_id,
            TopicFork.original_topic_id == topic.id,
            TopicFork.course_id.is_(None),
        )
    )
    existing = existing_q.scalar_one_or_none()
    if existing is not None:
        raise ForkExistsError(existing)

    fork = TopicFork(
        original_topic_id=topic.id,
        forked_by=user_id,
        course_id=None,
        markdown_source=_read_topic_source(topic),
    )
    # O3: `content_snapshot` retired. The self-heal pass in `import_seed.py`
    # drops the column on next run. Pre-O3 forks already have it `""` from
    # N's compat insert; nothing reads it.
    db.add(fork)
    await db.flush()
    await db.refresh(fork)
    return fork, topic


async def get_fork(
    db: AsyncSession, username: str, topic_slug: str
) -> tuple[TopicFork, User, Topic] | None:
    """Look up one user's fork of one topic. Returns `(fork, owner, topic)`
    or `None` when the user, the topic, or the fork doesn't exist.
    """
    owner = await _resolve_user(db, username)
    if owner is None:
        return None
    topic_q = await db.execute(select(Topic).where(Topic.slug == topic_slug))
    topic = topic_q.scalar_one_or_none()
    if topic is None:
        return None
    fork_q = await db.execute(
        select(TopicFork).where(
            TopicFork.forked_by == owner.id,
            TopicFork.original_topic_id == topic.id,
            TopicFork.course_id.is_(None),
        )
    )
    fork = fork_q.scalar_one_or_none()
    if fork is None:
        return None
    return fork, owner, topic


async def get_fork_by_id(db: AsyncSession, fork_id: uuid.UUID) -> TopicFork | None:
    result = await db.execute(select(TopicFork).where(TopicFork.id == fork_id))
    return result.scalar_one_or_none()


async def list_user_forks(
    db: AsyncSession, username: str
) -> list[tuple[TopicFork, Topic]] | None:
    """All of a user's personal forks, newest-edited first. Returns `None`
    when the username doesn't resolve.
    """
    owner = await _resolve_user(db, username)
    if owner is None:
        return None
    result = await db.execute(
        select(TopicFork, Topic)
        .join(Topic, Topic.id == TopicFork.original_topic_id)
        .where(
            TopicFork.forked_by == owner.id,
            TopicFork.course_id.is_(None),
        )
        .order_by(TopicFork.updated_at.desc())
    )
    return [(fork, topic) for fork, topic in result.all()]


async def list_my_forks(
    db: AsyncSession, user_id: uuid.UUID
) -> list[tuple[TopicFork, Topic]]:
    """The authenticated user's forks, keyed by id (avoids the username
    fuzzy-match round trip the public listing needs).
    """
    result = await db.execute(
        select(TopicFork, Topic)
        .join(Topic, Topic.id == TopicFork.original_topic_id)
        .where(
            TopicFork.forked_by == user_id,
            TopicFork.course_id.is_(None),
        )
        .order_by(TopicFork.updated_at.desc())
    )
    return [(fork, topic) for fork, topic in result.all()]


async def update_fork_source(
    db: AsyncSession, fork: TopicFork, markdown_source: str
) -> TopicFork:
    """Overwrite a fork's editable source. `updated_at` bumps via the
    model's `onupdate=func.now()`.
    """
    fork.markdown_source = markdown_source
    await db.flush()
    await db.refresh(fork)
    return fork


async def delete_fork(db: AsyncSession, fork: TopicFork) -> None:
    await db.delete(fork)
    await db.flush()


class ForkExistsError(Exception):
    """Raised by `create_fork` when the user already has a fork of the
    topic. Carries the existing fork so the API layer can 409 with a
    redirect target.
    """

    def __init__(self, existing: TopicFork):
        self.existing = existing
        super().__init__("fork already exists")
