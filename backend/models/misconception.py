import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Misconception(Base):
    """Common misconception linked to a topic.

    Misconceptions are searchable and appear as warnings on the parent topic.
    Example: 'P-values are the probability the null is true' linked to the p-value topic.
    """

    __tablename__ = "misconceptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id"), index=True)
    title: Mapped[str] = mapped_column(String(512))
    wrong_belief: Mapped[str] = mapped_column(Text)  # What people wrongly think
    correction: Mapped[str] = mapped_column(Text)  # The correct understanding
    why_common: Mapped[str | None] = mapped_column(Text, nullable=True)  # Why this misconception persists

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # Relationships
    topic: Mapped["Topic"] = relationship(back_populates="misconceptions")
