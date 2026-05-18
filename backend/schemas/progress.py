"""Pydantic shapes for the M1 progress-sync wire format.

The frontend's `progressStore` is the source-of-truth shape: the wire is a
direct mirror of it. One topic = one upsert. The server holds JSON sidecars
on `UserProgress` so the frontend can push and pull the whole slice without
splitting state across multiple endpoints.
"""

from typing import Literal

from pydantic import BaseModel, Field


# ---- Frontend-slice mirrors -----------------------------------------------


class DecisionEventSchema(BaseModel):
    """One decision pick: which option, when. Mirrors the frontend's
    `DecisionEvent` interface in `frontend/src/stores/progressStore.ts`.
    """

    optionId: str
    pickedAt: int  # epoch ms


class ReviewRecordSchema(BaseModel):
    """SM-2 review record for a topic. K3 introduced this on the frontend;
    M1 mirrors it to the server so the schedule survives across devices.
    """

    ease: float
    interval: int  # days
    lastReviewedAt: int  # epoch ms
    dueAt: int  # epoch ms


# ---- Wire types -----------------------------------------------------------


class TopicProgressUpsert(BaseModel):
    """The unit of sync: one topic's full progress slice.

    The client sends this whenever a topic's progress mutates. The server
    upserts the matching `(user_id, topic_id)` row by slug. Conflict
    resolution is last-write-wins on `client_updated_at` vs the row's
    existing `updated_at`.
    """

    topic_slug: str
    status: Literal["not_started", "in_progress", "completed"] = "not_started"
    comfort_level: int = 0

    decision_events: dict[str, DecisionEventSchema] = Field(default_factory=dict)
    review_schedule: ReviewRecordSchema | None = None
    confusion_flags: dict[str, int] = Field(default_factory=dict)

    # Client-supplied wall-clock for conflict resolution.
    client_updated_at: int  # epoch ms


class TopicProgressOut(TopicProgressUpsert):
    """Server response shape — same as the upsert plus the server's
    canonical `server_updated_at` timestamp. The client stores this so the
    next push can decide whether to overwrite.
    """

    server_updated_at: int  # epoch ms


class ProgressBundle(BaseModel):
    """Full snapshot of one user's progress. Used for boot rehydration and
    login merges. The list-of-topics shape matches what the client iterates
    over to populate `completedSlugs`, `inProgressSlugs`, `decisionEvents`,
    `reviewSchedule`, `confusionFlags`.
    """

    topics: list[TopicProgressOut]
