"""Merge-back review-queue endpoints — O1.

Mounted under `/api/merge-backs`. All endpoints require ADMIN or EDITOR
(matches the existing PUT/DELETE /api/content/blocks gate). The fork-side
suggest endpoint lives in `backend/api/forks.py` next to the other
fork-owner actions.
"""

import uuid

from fastapi import APIRouter, HTTPException, Query

from backend.deps import DB, CurrentUser
from backend.models.merge_back import MergeBackSuggestion
from backend.models.user import UserRole
from backend.schemas.merge_back import (
    MergeBackDetail,
    MergeBackRejectRequest,
    MergeBackSummary,
)
from backend.services import merge_service
from sqlalchemy import select

router = APIRouter()


def _ensure_reviewer(user) -> None:
    """ADMIN | EDITOR gate. Mirrors the inline-check pattern used in
    backend/api/content.py and courses.py."""
    if user.role not in (UserRole.ADMIN.value, UserRole.EDITOR.value):
        raise HTTPException(
            status_code=403,
            detail="Only admins and editors can review merge-back suggestions",
        )


@router.get("", response_model=list[MergeBackSummary])
async def list_review_queue(
    db: DB,
    user: CurrentUser,
    limit: int = Query(100, le=500),
):
    _ensure_reviewer(user)
    rows = await merge_service.list_review_queue(db, limit=limit)
    return [MergeBackSummary(**row) for row in rows]


@router.get("/{suggestion_id}", response_model=MergeBackDetail)
async def get_review_detail(suggestion_id: uuid.UUID, db: DB, user: CurrentUser):
    _ensure_reviewer(user)
    detail = await merge_service.get_review_detail(db, suggestion_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return MergeBackDetail(**detail)


@router.post("/{suggestion_id}/accept", response_model=MergeBackDetail)
async def accept(suggestion_id: uuid.UUID, db: DB, user: CurrentUser):
    _ensure_reviewer(user)
    row = await db.execute(
        select(MergeBackSuggestion).where(MergeBackSuggestion.id == suggestion_id)
    )
    suggestion = row.scalar_one_or_none()
    if suggestion is None:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    if suggestion.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Suggestion already {suggestion.status}",
        )
    await merge_service.accept_suggestion(db, suggestion, user.id)
    detail = await merge_service.get_review_detail(db, suggestion_id)
    assert detail is not None
    return MergeBackDetail(**detail)


@router.post("/{suggestion_id}/reject", response_model=MergeBackDetail)
async def reject(
    suggestion_id: uuid.UUID,
    payload: MergeBackRejectRequest,
    db: DB,
    user: CurrentUser,
):
    _ensure_reviewer(user)
    row = await db.execute(
        select(MergeBackSuggestion).where(MergeBackSuggestion.id == suggestion_id)
    )
    suggestion = row.scalar_one_or_none()
    if suggestion is None:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    if suggestion.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Suggestion already {suggestion.status}",
        )
    await merge_service.reject_suggestion(db, suggestion, user.id, payload.note)
    detail = await merge_service.get_review_detail(db, suggestion_id)
    assert detail is not None
    return MergeBackDetail(**detail)
