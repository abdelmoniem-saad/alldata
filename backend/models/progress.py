import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import ForeignKey, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class UserProgress(Base):
    """Tracks a learner's progress through the knowledge graph.

    M1: extended with three JSON sidecars (`decision_events`, `review_schedule`,
    `confusion_flags`) so the K-era event types — which today live only in
    the browser's `progressStore` — can mirror to the server and travel
    across devices. The sidecar shapes intentionally mirror the frontend
    slices so the wire format is just the same JSON the client already holds.

    Sync semantics: one row per (user, topic). The whole row is the unit of
    upsert — clients send the topic's full progress slice and the server
    replaces. Conflict resolution is last-write-wins on `client_updated_at`
    (see `backend/api/progress.py`); the `updated_at` column is the canonical
    server timestamp that clients store back for the next push.
    """

    __tablename__ = "user_progress"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="not_started", server_default="not_started")
    # Statuses: not_started, in_progress, completed

    # Adaptive graph data
    comfort_level: Mapped[int] = mapped_column(default=0, server_default="0")  # 0-5
    time_spent_seconds: Mapped[int] = mapped_column(default=0, server_default="0")

    # M1: K-era event sidecars. JSON dialect-aware — compiles to JSONB on
    # Postgres, TEXT (with JSON serialization on the way in/out) on SQLite.
    #
    # decision_events: { anchor_id: { optionId: str, pickedAt: int } }
    # review_schedule: { ease: float, interval: int, lastReviewedAt: int, dueAt: int } | null
    # confusion_flags: { block_id: int (0 or 1 per session) }
    #
    # Default '{}' so self-heal column-adds land cleanly without backfill.
    decision_events: Mapped[dict[str, Any]] = mapped_column(
        JSON, default=dict, server_default="'{}'"
    )
    review_schedule: Mapped[dict[str, Any] | None] = mapped_column(
        JSON, nullable=True, default=None
    )
    confusion_flags: Mapped[dict[str, Any]] = mapped_column(
        JSON, default=dict, server_default="'{}'"
    )

    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="progress")
    topic: Mapped["Topic"] = relationship()

    __table_args__ = (UniqueConstraint("user_id", "topic_id"),)
