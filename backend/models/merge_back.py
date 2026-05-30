"""MergeBackSuggestion — O1.

A fork owner's proposal to apply their fork's `markdown_source` to the
master topic. Snapshotted at suggest time so later fork edits don't mutate
a pending suggestion. One *pending* suggestion per fork — re-suggesting
while pending updates the snapshot in place rather than stacking.
"""

import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class MergeBackSuggestion(Base):
    __tablename__ = "merge_back_suggestions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    fork_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topic_forks.id"), index=True)
    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id"), index=True)
    suggested_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)

    # Snapshot of the fork's markdown at suggest time. Subsequent fork edits
    # don't mutate the suggestion — the reviewer sees a stable proposal.
    suggested_markdown: Mapped[str] = mapped_column(Text)

    # Lifecycle: pending → accepted | rejected. `server_default` so the J3
    # self-heal can ALTER ADD COLUMN cleanly if/when fields land later.
    status: Mapped[str] = mapped_column(
        String(20), default="pending", server_default="pending"
    )

    # Optional reviewer note (typically used on reject).
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )
