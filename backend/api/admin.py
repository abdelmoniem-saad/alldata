"""Admin routes, A3: user management + role assignment.

ADMIN-only surface behind `require_role`. The last-admin guard is the one
real invariant here: a platform whose only admin demotes or deactivates
themselves has no way back in (no email path, no CLI access on HF), so the
guard refuses rather than letting that state happen.
"""

import logging
import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from backend.deps import DB, CurrentUser, require_role
from backend.models.user import User, UserRole
from backend.schemas.user import UserResponse
from backend.services.analytics_service import top_events as top_analytics
from backend.services.coverage_service import build_coverage_report

logger = logging.getLogger("alldata")

router = APIRouter(dependencies=[require_role(UserRole.ADMIN)])

_VALID_ROLES = {r.value for r in UserRole}


async def _active_admin_count(db: DB, exclude_user_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(User)
        .where(User.role == UserRole.ADMIN.value)
        .where(User.is_active.is_(True))
        .where(User.id != exclude_user_id)
    )
    return result.scalar_one()


@router.get("/coverage")
async def get_coverage(db: DB):
    """B3: content-coverage report — interactive-block coverage, graph
    orphans, metadata gaps, and distributions. Read-only authoring lens;
    the same computation `seed.import_seed --report` prints."""
    return await build_coverage_report(db)


@router.get("/analytics")
async def get_analytics(db: DB, days: int = 30):
    """A10: first-party usage analytics — per-topic views/runs/picks over
    the last N days. Read-only; see analytics_service for the privacy
    posture (no IPs, no user IDs, aggregate counters only)."""
    return await top_analytics(db, days=min(max(days, 1), 90))


@router.get("/users", response_model=list[UserResponse])
async def list_users(db: DB, offset: int = 0, limit: int = 100):
    """List users, newest first. Limited fields; hashed passwords never leave."""
    limit = max(1, min(limit, 500))
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(max(0, offset)).limit(limit)
    )
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def set_role(user_id: uuid.UUID, role: str, admin: CurrentUser, db: DB):
    """Set a user's role. Refuses to demote the last active ADMIN."""
    if role not in _VALID_ROLES:
        raise HTTPException(
            status_code=422, detail=f"Role must be one of: {sorted(_VALID_ROLES)}"
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    was = user.role
    if was == role:
        return UserResponse.model_validate(user)

    if (
        was == UserRole.ADMIN.value
        and role != UserRole.ADMIN.value
        and await _active_admin_count(db, user.id) == 0
    ):
        raise HTTPException(
            status_code=409, detail="Cannot demote the last active admin"
        )

    user.role = role
    logger.info(
        "Role change: admin %s set %s (%s) from %s to %s",
        admin.email, user.display_name, user.id, was, role,
    )
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}/active", response_model=UserResponse)
async def set_active(user_id: uuid.UUID, active: bool, admin: CurrentUser, db: DB):
    """Deactivate / reactivate an account. Deactivated users can't log in
    (and fail `get_current_user` on existing tokens)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id and not active:
        raise HTTPException(status_code=409, detail="You cannot deactivate yourself")

    if (
        user.role == UserRole.ADMIN.value
        and not active
        and await _active_admin_count(db, user.id) == 0
    ):
        raise HTTPException(
            status_code=409, detail="Cannot deactivate the last active admin"
        )

    was = user.is_active
    user.is_active = active
    logger.info(
        "Active change: admin %s set %s (%s) active %s -> %s",
        admin.email, user.display_name, user.id, was, active,
    )
    return UserResponse.model_validate(user)
