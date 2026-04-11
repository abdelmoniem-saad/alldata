import enum
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class EdgeType(str, enum.Enum):
    PREREQUISITE = "prerequisite"  # source must be learned before target
    RELATED = "related"  # bidirectional conceptual link
    EXTENDS = "extends"  # target deepens source
    APPLIES = "applies"  # target uses source in practice
    CORRECTS = "corrects"  # links misconception to correct topic


class TopicEdge(Base):
    __tablename__ = "topic_edges"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id"), index=True)
    target_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id"), index=True)
    edge_type: Mapped[str] = mapped_column(String(30))
    weight: Mapped[float] = mapped_column(default=1.0)

    # "Why do I need this?" — concrete reason for the relationship
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    source: Mapped["Topic"] = relationship(foreign_keys=[source_id], back_populates="outgoing_edges")
    target: Mapped["Topic"] = relationship(foreign_keys=[target_id], back_populates="incoming_edges")

    __table_args__ = (
        UniqueConstraint("source_id", "target_id", "edge_type"),
        CheckConstraint("source_id != target_id", name="no_self_edges"),
    )
