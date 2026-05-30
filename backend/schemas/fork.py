"""Pydantic shapes for the N fork model.

A fork's editable surface is its `markdown_source`. The blocks a reader
sees are produced by parsing that source on every GET — the fork never
persists a parsed block tree. `ForkContentBlock` mirrors the frontend's
`ContentBlock` interface so the existing `ScrollReader` renders forks with
no per-fork render path.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel

from backend.schemas.topic import TopicSummary


class ForkContentBlock(BaseModel):
    """A parsed block from a fork's markdown. Same field set as the
    master-topic `ContentBlockResponse`, but `id` is a synthesized string
    (`{index}`) rather than a DB UUID — fork blocks have no DB rows.
    """

    id: str
    block_type: str
    content: str
    sort_order: int
    layer: str
    expected_output: str | None = None
    is_editable: bool = False
    simulation_config: str | None = None
    hint: str | None = None
    solution: str | None = None
    anchor: str | None = None
    meta: str | None = None


class ForkMisconception(BaseModel):
    """A legacy (non-inline) misconception parsed from fork markdown."""

    id: str
    title: str
    wrong_belief: str
    correction: str
    why_common: str | None = None


class ForkCreateIn(BaseModel):
    topic_slug: str


class ForkUpdateIn(BaseModel):
    markdown_source: str


class ForkPreviewIn(BaseModel):
    markdown_source: str


class ForkOut(BaseModel):
    """The fork's identity + editable source. Returned by create + update."""

    id: uuid.UUID
    username: str          # owner's display_name — the `/u/{username}/...` token
    topic_slug: str
    topic_title: str
    created_at: datetime
    updated_at: datetime
    markdown_source: str


class ForkSummary(BaseModel):
    """A row in a fork listing — no markdown body, just enough for a card."""

    id: uuid.UUID
    username: str
    topic_slug: str
    topic_title: str
    topic_domain: str | None
    topic_difficulty: str | None
    updated_at: datetime
    # O1: status of the latest merge-back suggestion for this fork, if any.
    # Drives the status chip on /u/me/forks and the fork-listing cards.
    suggestion_status: str | None = None


class ForkDetail(ForkOut):
    """Full read payload: identity + source + parsed blocks. The frontend
    routes `content_blocks` straight into `ScrollReader`.
    """

    owner_display_name: str
    content_blocks: list[ForkContentBlock]
    misconceptions: list[ForkMisconception]
    original_topic: TopicSummary
    # O1: status of the latest merge-back suggestion for this fork.
    # Drives the status chip on `ForkView` / `ForkEditor`. None when the
    # fork has never been suggested.
    suggestion_status: str | None = None


class ForkPreviewOut(BaseModel):
    """Editor live-preview payload. Parsed but not persisted. `warnings`
    carries the parser's `_warn(...)` output so the editor can surface
    directive typos without a round trip through `--strict`.
    """

    content_blocks: list[ForkContentBlock]
    misconceptions: list[ForkMisconception]
    warnings: list[str]
