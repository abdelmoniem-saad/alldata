import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class ReportStatus(enum.StrEnum):
    OPEN = "open"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class ContentReport(Base):
    """D5: a reader-flagged problem with a topic's content. The lightweight
    correction door next to the fork pipeline: anonymous readers can file
    (per-IP rate-limited), signed-in ones get their identity attached, and
    admins triage. Topic-level only in D5; block anchors can come later."""

    __tablename__ = "content_reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    topic_slug: Mapped[str] = mapped_column(String(120), index=True)
    block_anchor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    note: Mapped[str] = mapped_column(nullable=False)
    reporter_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(12), default=ReportStatus.OPEN.value)
    resolution_note: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
