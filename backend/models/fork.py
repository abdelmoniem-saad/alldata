import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class TopicFork(Base):
    """Professor's private customization of a topic within a course.

    Forks are scoped to courses and never appear in the canonical graph.
    This prevents the '40 versions of p-value' fragmentation problem.
    """

    __tablename__ = "topic_forks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    original_topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id"), index=True)
    forked_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    course_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("courses.id"), nullable=True)

    # JSON snapshot of content blocks at fork time + modifications
    content_snapshot: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
