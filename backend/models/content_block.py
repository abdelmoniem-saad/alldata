import enum
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class BlockType(str, enum.Enum):
    MARKDOWN = "markdown"
    CODE_PYTHON = "code_python"
    CODE_R = "code_r"
    SIMULATION = "simulation"  # Live simulation before formula
    QUIZ = "quiz"  # Micro-challenge / proof of understanding
    IMAGE = "image"
    INTERACTIVE = "interactive"
    # I — Dynamic Topic View
    PLOT = "plot"  # Reactive D3 plot bound to TopicState keys
    STEP_THROUGH = "step_through"  # Numbered reveal sequence
    CALLOUT = "callout"  # Insight / warning / aside panel
    DERIVATION = "derivation"  # Collapsible math derivation
    MISCONCEPTION_INLINE = "misconception_inline"  # Inline misconception card
    DECISION = "decision"  # Felt-consequence decision block (writes to TopicState)
    PLAYGROUND = "playground"  # Goal-driven controls bound to TopicState
    STATE = "state"  # TopicState defaults declaration (no rendered output)
    STATE_RESET = "state_reset"  # Snap state back to defaults at an anchor


class ExplanationLayer(str, enum.Enum):
    INTUITION = "intuition"  # Analogies, visuals, simulations
    FORMAL = "formal"  # Proofs, measure theory, mathematical rigor
    BOTH = "both"  # Shown in both layers


class ContentBlock(Base):
    __tablename__ = "content_blocks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topics.id"), index=True)
    block_type: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(default=0)
    version: Mapped[int] = mapped_column(default=1)

    # Dual explanation layer support
    layer: Mapped[str] = mapped_column(String(20), default=ExplanationLayer.BOTH.value)

    # For code blocks
    expected_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_editable: Mapped[bool] = mapped_column(default=False)  # Can the learner modify and re-run?

    # For simulation blocks
    simulation_config: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON config

    # For quiz/micro-challenge blocks
    hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    solution: Mapped[str | None] = mapped_column(Text, nullable=True)

    # I — Dynamic Topic View
    # `anchor` — slug used by the ScrollReader to pin viz / target navigation.
    # `meta` — JSON-serialized dict of directive params (plot spec/binds, callout kind,
    #          derivation title/collapsed, step_through steps, decision options, playground
    #          controls/goal, state defaults). Convention follows `simulation_config` (Text
    #          holding JSON) rather than introducing a JSONB column on a SQLite-friendly schema.
    anchor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    meta: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    # Relationships
    topic: Mapped["Topic"] = relationship(back_populates="content_blocks")
