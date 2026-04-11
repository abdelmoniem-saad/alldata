import enum
import uuid
from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class UserRole(str, enum.Enum):
    LEARNER = "learner"
    CONTRIBUTOR = "contributor"
    PROFESSOR = "professor"
    EDITOR = "editor"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(256))
    hashed_password: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(20), default=UserRole.LEARNER.value)
    institution: Mapped[str | None] = mapped_column(String(256), nullable=True)
    bio: Mapped[str | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Relationships
    topics: Mapped[list["Topic"]] = relationship(back_populates="author", foreign_keys="Topic.created_by")
    courses: Mapped[list["Course"]] = relationship(back_populates="creator", foreign_keys="Course.created_by")
    progress: Mapped[list["UserProgress"]] = relationship(back_populates="user")
