"""User progress sync — M1 (H10 carryover).

One row per (user, topic). The wire is the topic's full progress slice;
upserts replace, conflict resolution is last-write-wins on
`client_updated_at` vs the server row's `updated_at`. The server clock is
canonical on ties.

The K-era event types (`decision_events`, `review_schedule`,
`confusion_flags`) ride on JSON sidecars on `UserProgress` so the wire
format mirrors the frontend's `progressStore` exactly. No deep merge — the
client always sends its full per-topic view.

Endpoints:
  GET    /api/users/me/progress
  PUT    /api/users/me/progress/{topic_slug}
  POST   /api/users/me/progress/batch
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from backend.deps import DB, CurrentUser
from backend.models.progress import UserProgress
from backend.models.topic import Topic
from backend.schemas.progress import (
    ProgressBundle,
    TopicProgressOut,
    TopicProgressUpsert,
)

router = APIRouter()


def _row_to_out(row: UserProgress, slug: str) -> TopicProgressOut:
    """Project a UserProgress row into the wire-shape `TopicProgressOut`.

    The slug isn't on the row itself (we key by topic_id internally) — pass
    it in from the join. `server_updated_at` is the canonical epoch-ms
    timestamp clients should store for the next push's conflict resolution.
    """
    return TopicProgressOut(
        topic_slug=slug,
        status=row.status,  # type: ignore[arg-type]
        comfort_level=row.comfort_level,
        decision_events=row.decision_events or {},
        review_schedule=row.review_schedule,
        confusion_flags=row.confusion_flags or {},
        client_updated_at=int(row.updated_at.replace(tzinfo=timezone.utc).timestamp() * 1000),
        server_updated_at=int(row.updated_at.replace(tzinfo=timezone.utc).timestamp() * 1000),
    )


async def _upsert_one(
    db,
    user_id,
    payload: TopicProgressUpsert,
) -> TopicProgressOut:
    """Apply one TopicProgressUpsert. Returns the post-write wire shape.

    Conflict resolution: if a server row exists and `client_updated_at <
    server.updated_at`, the server wins — return the server's current state
    without writing. The client adopts what it gets back.
    """
    # Look the topic up by slug. Topics that don't exist are a 404 — silent
    # ignore would lose user writes for a typo or stale slug.
    topic_q = await db.execute(select(Topic).where(Topic.slug == payload.topic_slug))
    topic = topic_q.scalar_one_or_none()
    if topic is None:
        raise HTTPException(status_code=404, detail=f"unknown topic: {payload.topic_slug}")

    # Existing row?
    existing_q = await db.execute(
        select(UserProgress).where(
            UserProgress.user_id == user_id,
            UserProgress.topic_id == topic.id,
        )
    )
    row = existing_q.scalar_one_or_none()

    if row is not None:
        server_ms = int(row.updated_at.replace(tzinfo=timezone.utc).timestamp() * 1000)
        if payload.client_updated_at < server_ms:
            # Server wins — return its state unchanged.
            return _row_to_out(row, payload.topic_slug)
        # Client wins (>) or tie (==) → server clock is canonical for ties,
        # but the data is identical so it doesn't matter; still write to
        # bump updated_at to now.
        row.status = payload.status
        row.comfort_level = payload.comfort_level
        row.decision_events = {k: v.model_dump() for k, v in payload.decision_events.items()}
        row.review_schedule = (
            payload.review_schedule.model_dump() if payload.review_schedule else None
        )
        row.confusion_flags = dict(payload.confusion_flags)
        if payload.status == "completed" and row.completed_at is None:
            row.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        # updated_at auto-updates via the model's onupdate=func.now()
    else:
        row = UserProgress(
            user_id=user_id,
            topic_id=topic.id,
            status=payload.status,
            comfort_level=payload.comfort_level,
            decision_events={k: v.model_dump() for k, v in payload.decision_events.items()},
            review_schedule=(
                payload.review_schedule.model_dump() if payload.review_schedule else None
            ),
            confusion_flags=dict(payload.confusion_flags),
            started_at=datetime.now(timezone.utc).replace(tzinfo=None),
            completed_at=(
                datetime.now(timezone.utc).replace(tzinfo=None)
                if payload.status == "completed"
                else None
            ),
        )
        db.add(row)

    await db.flush()
    await db.refresh(row)
    return _row_to_out(row, payload.topic_slug)


@router.get("/me/progress", response_model=ProgressBundle)
async def get_my_progress(user: CurrentUser, db: DB) -> ProgressBundle:
    """Full snapshot of the authenticated user's progress.

    Used for boot-time rehydration and the post-login merge step. The
    client merges the returned bundle with its local `progressStore`
    (per-topic last-write-wins on the timestamps).
    """
    q = await db.execute(
        select(UserProgress, Topic.slug)
        .join(Topic, Topic.id == UserProgress.topic_id)
        .where(UserProgress.user_id == user.id)
    )
    rows = q.all()
    return ProgressBundle(
        topics=[_row_to_out(row, slug) for row, slug in rows],
    )


@router.put("/me/progress/{topic_slug}", response_model=TopicProgressOut)
async def upsert_topic_progress(
    topic_slug: str,
    payload: TopicProgressUpsert,
    user: CurrentUser,
    db: DB,
) -> TopicProgressOut:
    """Upsert one topic's progress.

    The body's `topic_slug` must match the path slug (defensive — clients
    shouldn't construct a PUT with a mismatched body, but if they do we
    fail loudly rather than write to the wrong row).
    """
    if payload.topic_slug != topic_slug:
        raise HTTPException(
            status_code=400,
            detail=f"body topic_slug ({payload.topic_slug}) ≠ path ({topic_slug})",
        )
    return await _upsert_one(db, user.id, payload)


@router.post("/me/progress/batch", response_model=ProgressBundle)
async def batch_upsert_progress(
    payloads: list[TopicProgressUpsert],
    user: CurrentUser,
    db: DB,
) -> ProgressBundle:
    """Batch-upsert N topics in one call.

    Used on first login when the client has a non-empty local
    `progressStore`. The client sends every locally-known topic; the
    server applies each (with per-topic last-write-wins) and returns the
    post-merge bundle. The client adopts what it gets back.
    """
    results: list[TopicProgressOut] = []
    for payload in payloads:
        results.append(await _upsert_one(db, user.id, payload))
    return ProgressBundle(topics=results)
