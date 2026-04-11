import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    institution: Mapped[str | None] = mapped_column(String(256), nullable=True)
    semester: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_public: Mapped[bool] = mapped_column(default=False)

    # Fork lineage
    forked_from: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("courses.id"), nullable=True
    )

    # Authorship
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Relationships
    creator: Mapped["User"] = relationship(back_populates="courses", foreign_keys=[created_by])
    topic_mappings: Mapped[list["CourseTopicMapping"]] = relationship(
        back_populates="course", cascade="all, delete-orphan"
    )


class CourseTopicMapping(Base):
    __tablename__ = "course_topic_mappings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"), index=True)
    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id"), index=True)
    week_number: Mapped[int | None] = mapped_column(nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0)

    # Professor can add notes without forking the whole topic
    override_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Office hours annotations (time-limited)
    office_hours_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    office_hours_expires: Mapped[datetime | None] = mapped_column(nullable=True)

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="topic_mappings")
    topic: Mapped["Topic"] = relationship()
