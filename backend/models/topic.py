import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class TopicStatus(str, enum.Enum):
    DRAFT = "draft"
    REVIEW = "review"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class TopicDifficulty(str, enum.Enum):
    INTRO = "intro"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(512))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Hierarchy: parent-child for topic nesting
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("topics.id"), nullable=True, index=True
    )
    depth: Mapped[int] = mapped_column(default=0)  # 0=domain, 1=area, 2=topic, 3=subtopic
    sort_order: Mapped[int] = mapped_column(default=0)

    # Metadata
    status: Mapped[str] = mapped_column(String(20), default=TopicStatus.DRAFT.value)
    difficulty: Mapped[str | None] = mapped_column(String(20), nullable=True)
    domain: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    # Dual explanation layers
    has_intuition_layer: Mapped[bool] = mapped_column(default=True)
    has_formal_layer: Mapped[bool] = mapped_column(default=False)

    # Authorship
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Relationships
    parent: Mapped["Topic | None"] = relationship(
        back_populates="children", remote_side="Topic.id"
    )
    children: Mapped[list["Topic"]] = relationship(back_populates="parent")
    author: Mapped["User"] = relationship(back_populates="topics", foreign_keys=[created_by])
    content_blocks: Mapped[list["ContentBlock"]] = relationship(
        back_populates="topic", order_by="ContentBlock.sort_order", cascade="all, delete-orphan"
    )
    outgoing_edges: Mapped[list["TopicEdge"]] = relationship(
        foreign_keys="TopicEdge.source_id", back_populates="source", cascade="all, delete-orphan"
    )
    incoming_edges: Mapped[list["TopicEdge"]] = relationship(
        foreign_keys="TopicEdge.target_id", back_populates="target", cascade="all, delete-orphan"
    )
    misconceptions: Mapped[list["Misconception"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )
