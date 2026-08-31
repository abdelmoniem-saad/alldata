"""User routes, A2 account settings + K7/M1 public snapshot.

- `GET  /{username}/snapshot` — public, read-only graph snapshot (K7/M1).
- `PATCH /me`                — update profile fields, optionally the password
                               (requires the current password).
- `POST /me/recovery-code`   — A2: generate/rotate the single-use recovery
                               code; returned in plaintext exactly once.
"""

import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from passlib.context import CryptContext
from sqlalchemy import func, or_, select

from backend.deps import DB, CurrentUser
from backend.models.progress import UserProgress
from backend.models.topic import Topic
from backend.models.user import User
from backend.schemas.user import (
    PasswordChange,
    RecoveryCodeResponse,
    UserResponse,
    UserUpdate,
)

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# A2: password floor. Deliberately modest — this is a learning site, not a
# bank — but something better than "1".
MIN_PASSWORD_LENGTH = 8


@router.patch("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, user: CurrentUser, db: DB):
    """Update the caller's profile. Fields left as None stay unchanged."""
    if data.display_name is not None:
        name = data.display_name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Display name cannot be empty")
        if len(name) > 256:
            raise HTTPException(status_code=422, detail="Display name too long")
        user.display_name = name
    if data.bio is not None:
        if len(data.bio) > 2000:
            raise HTTPException(status_code=422, detail="Bio too long")
        user.bio = data.bio
    if data.institution is not None:
        if len(data.institution) > 256:
            raise HTTPException(status_code=422, detail="Institution too long")
        user.institution = data.institution
    return UserResponse.model_validate(user)


@router.patch("/me/password", response_model=UserResponse)
async def change_password(data: PasswordChange, user: CurrentUser, db: DB):
    """Change the password. Requires the current password — the one secret
    an attacker with a stolen session token doesn't have."""
    if len(data.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"New password must be at least {MIN_PASSWORD_LENGTH} characters",
        )
    if not pwd_context.verify(data.current_password, user.hashed_password):
        raise HTTPException(status_code=403, detail="Current password is incorrect")

    user.hashed_password = pwd_context.hash(data.new_password)
    # A password change invalidates any outstanding recovery code.
    user.recovery_code_hash = None
    user.recovery_code_generated_at = None
    return UserResponse.model_validate(user)


@router.post("/me/recovery-code", response_model=RecoveryCodeResponse)
async def generate_recovery_code(user: CurrentUser, db: DB):
    """Generate (or rotate) the single-use recovery code.

    The code is returned in plaintext exactly once — the server stores only
    the bcrypt hash. Generating a new code invalidates the previous one.
    """
    code = "-".join(secrets.token_hex(2) for _ in range(4))  # xxxx-xxxx-xxxx-xxxx
    user.recovery_code_hash = pwd_context.hash(code)
    # Column is TIMESTAMP WITHOUT TIME ZONE (asyncpg maps that to offset-naïve
    # datetime), so store naive UTC explicitly rather than depending on how
    # the driver happens to handle an aware value in a naive column.
    user.recovery_code_generated_at = datetime.now(UTC).replace(tzinfo=None)
    return RecoveryCodeResponse(recovery_code=code, generated_at=user.recovery_code_generated_at)


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
    # email or any other PII, the lookup is fuzzy on display_name and an
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
    # UserProgress rows. Only the two slug lists are exposed publicly,
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
