"""User snapshot routes — K7.

Returns a public graph snapshot for a named user: their completed and
in-progress slug sets, plus public profile metadata (display_name only).

In the K cycle, server-side progress sync isn't yet wired up (H10 backlog),
so the only "real" data available is from the seed `system` user, which is
empty by design. The endpoint exists so the `/u/:username` route can hit a
canonical shape; once H10 lands, only the implementation changes.

For users who haven't synced progress, we return an empty progress payload
along with the user's display name. The frontend renders the graph as a
"no progress yet" view rather than 404'ing — the URL still belongs to a
real user, even if the data isn't there yet.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select, or_, func

from backend.deps import DB
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

    # K7: progress data is localStorage-only until H10 lands. Return empty
    # sets so the frontend renders a "no progress yet" view rather than
    # crashing on the missing fields.
    return JSONResponse({
        "username": username,
        "display_name": user.display_name,
        "completed_slugs": [],
        "in_progress_slugs": [],
        "synced": False,
    })
