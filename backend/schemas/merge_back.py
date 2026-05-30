"""Wire shapes for merge-back — O1."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class MergeBackSummary(BaseModel):
    """Row in the review-queue list. Carries enough to label and order
    each pending/resolved suggestion without an extra round trip."""

    id: uuid.UUID
    fork_id: uuid.UUID
    topic_id: uuid.UUID
    topic_slug: str
    topic_title: str
    suggested_by: uuid.UUID
    suggester_display_name: str
    status: Literal["pending", "accepted", "rejected"]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MergeBackDetail(MergeBackSummary):
    """Per-suggestion review surface. Carries both sides for the diff view:
    `master_markdown` is the topic's current on-disk content; `suggested_markdown`
    is the snapshot captured at suggest time."""

    master_markdown: str
    suggested_markdown: str
    review_note: str | None
    reviewed_by: uuid.UUID | None
    reviewer_display_name: str | None
    reviewed_at: datetime | None


class MergeBackRejectRequest(BaseModel):
    """Body for POST /merge-backs/{id}/reject. `note` is optional."""

    note: str | None = None
