import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class UserProgress(Base):
    """Tracks a learner's progress through the knowledge graph."""

    __tablename__ = "user_progress"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="not_started")
    # Statuses: not_started, in_progress, completed

    # Adaptive graph data
    comfort_level: Mapped[int] = mapped_column(default=0)  # 0-5, self-reported or quiz-derived
    time_spent_seconds: Mapped[int] = mapped_column(default=0)

    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship(back_populates="progress")
    topic: Mapped["Topic"] = relationship()

    __table_args__ = (UniqueConstraint("user_id", "topic_id"),)
