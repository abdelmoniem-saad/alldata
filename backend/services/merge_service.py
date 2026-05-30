"""merge_service — O1.

The two primitives merge-back needs:

  - `apply_markdown_to_topic(db, topic, markdown)` — replace a topic's
    content blocks + misconceptions atomically from a fresh `content.md`
    source. Reuses the seed importer's parser and the same block /
    misconception split.

  - `write_topic_source(topic, markdown)` — write the markdown to disk at
    `seed/topics/{domain}/{slug}/content.md`. The reimport convention
    (`import_seed`) skips topics that already have content, so a DB-only
    update is durable — writing the seed file is about keeping the repo's
    seed files honest as source-of-truth, not durability.

Higher-level orchestration:

  - `suggest_from_fork(db, fork, user_id)` — create or refresh the fork's
    pending suggestion (one pending per fork).
  - `list_review_queue(db)` / `get_review_detail(db, suggestion_id)` —
    review-queue reads.
  - `accept_suggestion(db, suggestion, reviewer_id)` — apply to master.
  - `reject_suggestion(db, suggestion, reviewer_id, note)` — close out.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.content_block import ContentBlock
from backend.models.fork import TopicFork
from backend.models.merge_back import MergeBackSuggestion
from backend.models.misconception import Misconception
from backend.models.topic import Topic
from backend.models.user import User
from seed.import_seed import SEED_DIR, parse_content_md

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


# ─── Core primitives ──────────────────────────────────────────────────────


async def apply_markdown_to_topic(
    db: AsyncSession, topic: Topic, markdown: str
) -> None:
    """Replace a topic's content_blocks and misconceptions from a fresh
    markdown source.

    Atomic within the request's transaction: the delete + insert run in
    one DB session. Uses the seed importer's parser so block-type
    semantics (gear, plot, decision, simulation, code_r, dataset, …)
    match exactly what a `seed.import_seed` run would produce.
    """
    # Re-parse the markdown. Re-uses the same parser the seed import
    # runs, so a suggestion's blocks come out identical to what a
    # fresh import of the same content.md would write.
    parsed = parse_content_md(markdown, topic_name=topic.slug)

    # Wipe existing rows. Cascade isn't set up to handle this, so we
    # delete explicitly. Both tables key by `topic_id`.
    await db.execute(delete(ContentBlock).where(ContentBlock.topic_id == topic.id))
    await db.execute(delete(Misconception).where(Misconception.topic_id == topic.id))

    # Re-insert, mirroring import_seed's block / misconception split.
    for block in parsed:
        if block["block_type"] == "misconception":
            db.add(Misconception(
                topic_id=topic.id,
                title=block["title"],
                wrong_belief=block["wrong_belief"],
                correction=block["correction"],
                why_common=block.get("why_common"),
            ))
        else:
            db.add(ContentBlock(
                topic_id=topic.id,
                block_type=block["block_type"],
                content=block.get("content", ""),
                sort_order=block.get("sort_order", 0),
                layer=block.get("layer", "both"),
                expected_output=block.get("expected_output"),
                is_editable=block.get("is_editable", False),
                hint=block.get("hint"),
                solution=block.get("solution"),
                anchor=block.get("anchor"),
                meta=block.get("meta"),
            ))

    await db.flush()


def write_topic_source(topic: Topic, markdown: str) -> bool:
    """Write `markdown` to `seed/topics/{domain}/{slug}/content.md`.

    Returns True if the file was written, False if skipped (e.g. the
    topic has no `domain` — an API-created topic never seeded to disk).
    The DB update should still proceed; the on-disk write is best-effort.
    """
    if not topic.domain or not topic.slug:
        logger.warning(
            "write_topic_source: skipping disk write for topic %s "
            "(missing domain or slug)", topic.id
        )
        return False
    path = SEED_DIR / "topics" / topic.domain / topic.slug / "content.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(markdown, encoding="utf-8")
    return True


def read_topic_source(topic: Topic) -> str:
    """Read the master's current `content.md` from disk. Used for the
    'before' side of the review diff.

    Falls back to an empty string if the file isn't present (a topic that
    exists in the DB but was never written to seed); the diff will then
    render entirely as additions, which is the honest representation.
    """
    if not topic.domain or not topic.slug:
        return ""
    path = SEED_DIR / "topics" / topic.domain / topic.slug / "content.md"
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


# ─── Suggestion lifecycle ─────────────────────────────────────────────────


async def _get_pending_for_fork(
    db: AsyncSession, fork_id: uuid.UUID
) -> MergeBackSuggestion | None:
    """The fork's currently pending suggestion, or None.

    Convention: one *pending* suggestion per fork. Re-suggesting while
    one is pending updates that row instead of creating a second."""
    row = await db.execute(
        select(MergeBackSuggestion)
        .where(MergeBackSuggestion.fork_id == fork_id)
        .where(MergeBackSuggestion.status == "pending")
        .limit(1)
    )
    return row.scalar_one_or_none()


async def latest_status_for_fork(
    db: AsyncSession, fork_id: uuid.UUID
) -> str | None:
    """The most-recent suggestion status for this fork — pending, accepted,
    or rejected — or None if the fork has never suggested. Used to render
    the status chip on fork surfaces."""
    row = await db.execute(
        select(MergeBackSuggestion.status)
        .where(MergeBackSuggestion.fork_id == fork_id)
        .order_by(desc(MergeBackSuggestion.created_at))
        .limit(1)
    )
    return row.scalar_one_or_none()


async def suggest_from_fork(
    db: AsyncSession, fork: TopicFork, user_id: uuid.UUID
) -> MergeBackSuggestion:
    """Create or refresh the fork's pending merge-back suggestion.

    Snapshots `fork.markdown_source` at call time so later fork edits
    don't mutate a pending suggestion. If a pending one already exists,
    the snapshot is updated in place (the owner is revising their
    proposal); previously accepted/rejected suggestions are left alone.
    """
    existing = await _get_pending_for_fork(db, fork.id)
    if existing is not None:
        existing.suggested_markdown = fork.markdown_source
        await db.flush()
        return existing

    suggestion = MergeBackSuggestion(
        fork_id=fork.id,
        topic_id=fork.original_topic_id,
        suggested_by=user_id,
        suggested_markdown=fork.markdown_source,
        status="pending",
    )
    db.add(suggestion)
    await db.flush()
    return suggestion


async def list_review_queue(
    db: AsyncSession, limit: int = 100
) -> list[dict]:
    """Pending suggestions first, then the most recent resolved. Returns
    dicts shaped for the wire schema (topic_slug / topic_title / suggester
    display name) so the queue view doesn't fan out N round trips per row.
    """
    # Pull suggestions joined to their topic + suggester
    rows = await db.execute(
        select(MergeBackSuggestion, Topic, User)
        .join(Topic, Topic.id == MergeBackSuggestion.topic_id)
        .join(User, User.id == MergeBackSuggestion.suggested_by)
        .order_by(
            # Pending first; then newest first
            (MergeBackSuggestion.status != "pending"),
            desc(MergeBackSuggestion.updated_at),
        )
        .limit(limit)
    )
    out: list[dict] = []
    for sug, topic, suggester in rows.all():
        out.append({
            "id": sug.id,
            "fork_id": sug.fork_id,
            "topic_id": sug.topic_id,
            "topic_slug": topic.slug,
            "topic_title": topic.title,
            "suggested_by": sug.suggested_by,
            "suggester_display_name": suggester.display_name,
            "status": sug.status,
            "created_at": sug.created_at,
            "updated_at": sug.updated_at,
        })
    return out


async def get_review_detail(
    db: AsyncSession, suggestion_id: uuid.UUID
) -> dict | None:
    """Full suggestion + master_markdown (current disk content) for the
    diff view. Returns None if the suggestion isn't found."""
    row = await db.execute(
        select(MergeBackSuggestion, Topic, User)
        .join(Topic, Topic.id == MergeBackSuggestion.topic_id)
        .join(User, User.id == MergeBackSuggestion.suggested_by)
        .where(MergeBackSuggestion.id == suggestion_id)
    )
    hit = row.first()
    if hit is None:
        return None
    sug, topic, suggester = hit

    reviewer_name: str | None = None
    if sug.reviewed_by is not None:
        reviewer_row = await db.execute(
            select(User.display_name).where(User.id == sug.reviewed_by)
        )
        reviewer_name = reviewer_row.scalar_one_or_none()

    return {
        "id": sug.id,
        "fork_id": sug.fork_id,
        "topic_id": sug.topic_id,
        "topic_slug": topic.slug,
        "topic_title": topic.title,
        "suggested_by": sug.suggested_by,
        "suggester_display_name": suggester.display_name,
        "status": sug.status,
        "created_at": sug.created_at,
        "updated_at": sug.updated_at,
        "master_markdown": read_topic_source(topic),
        "suggested_markdown": sug.suggested_markdown,
        "review_note": sug.review_note,
        "reviewed_by": sug.reviewed_by,
        "reviewer_display_name": reviewer_name,
        "reviewed_at": sug.reviewed_at,
    }


async def accept_suggestion(
    db: AsyncSession, suggestion: MergeBackSuggestion, reviewer_id: uuid.UUID
) -> None:
    """Apply the suggestion to the master topic: replace blocks +
    misconceptions in the DB, then write the seed file. The DB update is
    inside the request transaction; the disk write is best-effort (logs
    on failure but doesn't roll back)."""
    topic_row = await db.execute(
        select(Topic)
        .where(Topic.id == suggestion.topic_id)
        .options(selectinload(Topic.content_blocks))
    )
    topic = topic_row.scalar_one()

    await apply_markdown_to_topic(db, topic, suggestion.suggested_markdown)
    write_topic_source(topic, suggestion.suggested_markdown)

    suggestion.status = "accepted"
    suggestion.reviewed_by = reviewer_id
    suggestion.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()


async def reject_suggestion(
    db: AsyncSession,
    suggestion: MergeBackSuggestion,
    reviewer_id: uuid.UUID,
    note: str | None,
) -> None:
    suggestion.status = "rejected"
    suggestion.review_note = note
    suggestion.reviewed_by = reviewer_id
    suggestion.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.flush()
