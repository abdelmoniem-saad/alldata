import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class TopicFork(Base):
    """A user's editable copy of a topic.

    N (fork model): a fork carries its own `markdown_source` — the editable
    `content.md` text — and serves as a read-only surface to other viewers
    at `/u/{username}/topic/{slug}`. Any authenticated user can fork any
    topic; forks are public by default. The blocks a reader sees come from
    re-parsing `markdown_source` on each GET.

    One fork per (user, topic) for the personal-fork path. `course_id` is
    nullable and reserved for a later cycle that pairs forks with the
    existing Course model — N-created forks always leave it null.

    History: this table was scaffolded in an earlier cycle as a
    professor-only, course-scoped customization mechanism but never wired
    to a surface. N generalized it (dropped the role gate, made the course
    optional, added the editable `markdown_source`).
    """

    __tablename__ = "topic_forks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    original_topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id"), index=True)
    forked_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("courses.id"), nullable=True)

    # N0: the editable source of truth. Seeded at fork time from the master
    # topic's content.md; the fork editor (PUT /api/forks/...) overwrites it.
    # `server_default="''"` so the J3 self-heal can ALTER ADD the column on
    # an existing SQLite DB without a backfill step.
    markdown_source: Mapped[str] = mapped_column(Text, server_default="''")

    # O3: `content_snapshot` (a K-era JSON cache of parsed blocks) was
    # removed here. Nothing read it — the N endpoints re-parse
    # `markdown_source` on every GET. The importer's self-heal drops the
    # column on next run via the `_O3_DROP_COLUMNS` list in `import_seed.py`.

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
