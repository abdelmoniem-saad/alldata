"""User snapshot routes — K7 (M1: wired to real progress).

Returns a public graph snapshot for a named user: their completed and
in-progress slug sets, plus public profile metadata (display_name only).

K7 shipped this endpoint as a stub returning empty progress because
server-side sync wasn't yet wired. M1 (progress sync) replaced the stub
with a real read from `UserProgress`. The endpoint signature is unchanged
so existing frontend code keeps working; only the body of the response
changed from "always empty" to "what the user has synced so far."
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, or_, func

from backend.deps import DB
from backend.models.progress import UserProgress
from backend.models.topic import Topic
from backend.models.user import User

router = APIRouter()


@router.get("/{username}/snapshot")
async def get_user_snapshot(username: str, db: DB):
    """Return a public graph snapshot for the named user.

    `username` matches against the user's display_name (case-insensitive,
    spaces or dashes interchangeable) or the local-part of their email.
    """
    if not username:
        raise HTTPException(status_code=404, detail="user not found")

    # Normalize the lookup token: lowercase, dashes/underscores → spaces.
    norm = username.lower().replace("-", " ").replace("_", " ").strip()

    # Match on a few sensible candidates. We intentionally don't expose the
    # email or any other PII — the lookup is fuzzy on display_name and an
    # email-local-part shortcut.
    result = await db.execute(
        select(User).where(
            or_(
                func.lower(User.display_name) == norm,
                func.lower(User.display_name) == username.lower(),
                func.lower(User.email).like(f"{username.lower()}@%"),
            )
        )
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail=f"user '{username}' not found")

    # M1: aggregate completed + in-progress slugs from the user's
    # UserProgress rows. Only the two slug lists are exposed publicly —
    # decision events, review schedule, and confusion flags stay private to
    # the owner (and don't make sense in a "look at someone's progress map"
    # surface anyway).
    rows = await db.execute(
        select(UserProgress.status, Topic.slug)
        .join(Topic, Topic.id == UserProgress.topic_id)
        .where(UserProgress.user_id == user.id)
    )
    completed: list[str] = []
    in_progress: list[str] = []
    for status, slug in rows.all():
        if status == "completed":
            completed.append(slug)
        elif status == "in_progress":
            in_progress.append(slug)

    return JSONResponse({
        "username": username,
        "display_name": user.display_name,
        "completed_slugs": completed,
        "in_progress_slugs": in_progress,
        "synced": True,
    })
