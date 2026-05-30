"""Fork routes — N (fork model).

A fork is a user's editable copy of one topic. Any authenticated user can
fork any topic; forks are public via `/u/{username}/topic/{slug}`.

Endpoints:
  POST   /api/forks                       create a fork (seeded from master)
  GET    /api/forks/me                    the caller's forks
  GET    /api/forks/{username}            a user's public fork listing
  GET    /api/forks/{username}/{slug}     read one fork (parsed)
  PUT    /api/forks/{username}/{slug}     overwrite the source (owner only)
  DELETE /api/forks/{username}/{slug}     delete the fork (owner only)
  POST   /api/forks/preview               parse markdown without persisting
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select

from backend.config import settings
from backend.deps import DB, CurrentUser
from backend.models.fork import TopicFork
from backend.models.topic import Topic
from backend.models.user import User
from backend.schemas.fork import (
    ForkContentBlock,
    ForkCreateIn,
    ForkDetail,
    ForkMisconception,
    ForkOut,
    ForkPreviewIn,
    ForkPreviewOut,
    ForkSummary,
    ForkUpdateIn,
)
from backend.schemas.merge_back import MergeBackSummary
from backend.schemas.topic import TopicSummary
from backend.services import fork_service, merge_service
from seed import import_seed

router = APIRouter()

# Optional-auth dependency. `/api/forks/{username}` and `/api/forks/
# {username}/{slug}` are public reads, but if a token *is* present we still
# resolve it so the response can carry an "is this mine?" affordance later.
# Returns None for an anonymous request rather than raising.
_optional_oauth = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_optional_user(
    token: Annotated[str | None, Depends(_optional_oauth)],
    db: DB,
) -> User | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    return user if (user and user.is_active) else None


OptionalUser = Annotated[User | None, Depends(get_optional_user)]


# ── parse helpers ───────────────────────────────────────────────────────────


def _parse_markdown(markdown: str, topic_name: str) -> tuple[
    list[ForkContentBlock], list[ForkMisconception], list[str]
]:
    """Parse fork markdown into wire-shape blocks + misconceptions + parser
    warnings. Reuses the seed importer's `parse_content_md`; warnings are
    captured by diffing the importer's module-level `_WARNINGS` list across
    the call (the parse is synchronous, so no request interleaves).
    """
    before = len(import_seed._WARNINGS)
    parsed = import_seed.parse_content_md(markdown, topic_name=topic_name)
    warnings = list(import_seed._WARNINGS[before:])

    blocks: list[ForkContentBlock] = []
    misconceptions: list[ForkMisconception] = []
    for i, b in enumerate(parsed):
        if b.get("block_type") == "misconception":
            # Legacy non-inline misconception — parsed dict has a distinct
            # shape (title / wrong_belief / correction / why_common).
            misconceptions.append(ForkMisconception(
                id=f"m{i}",
                title=b.get("title", "Common Misconception"),
                wrong_belief=b.get("wrong_belief", ""),
                correction=b.get("correction", ""),
                why_common=b.get("why_common"),
            ))
            continue
        blocks.append(ForkContentBlock(
            id=str(i),
            block_type=b["block_type"],
            content=b.get("content", "") or "",
            sort_order=b.get("sort_order", i),
            layer=b.get("layer", "both"),
            expected_output=b.get("expected_output"),
            is_editable=bool(b.get("is_editable", False)),
            simulation_config=b.get("simulation_config"),
            hint=b.get("hint"),
            solution=b.get("solution"),
            anchor=b.get("anchor"),
            meta=b.get("meta"),
        ))
    return blocks, misconceptions, warnings


def _fork_out(fork: TopicFork, topic: Topic, owner: User) -> ForkOut:
    return ForkOut(
        id=fork.id,
        username=owner.display_name,
        topic_slug=topic.slug,
        topic_title=topic.title,
        created_at=fork.created_at,
        updated_at=fork.updated_at,
        markdown_source=fork.markdown_source or "",
    )


async def _fork_detail(
    db: DB, fork: TopicFork, topic: Topic, owner: User
) -> ForkDetail:
    blocks, misconceptions, _ = _parse_markdown(fork.markdown_source or "", topic.slug)
    # O1: surface the latest merge-back status so the frontend doesn't need
    # a second round trip to render the status chip.
    suggestion_status = await merge_service.latest_status_for_fork(db, fork.id)
    return ForkDetail(
        **_fork_out(fork, topic, owner).model_dump(),
        owner_display_name=owner.display_name,
        content_blocks=blocks,
        misconceptions=misconceptions,
        original_topic=TopicSummary.model_validate(topic),
        suggestion_status=suggestion_status,
    )


# ── endpoints ───────────────────────────────────────────────────────────────


@router.post("", response_model=ForkOut, status_code=status.HTTP_201_CREATED)
async def create_fork(data: ForkCreateIn, user: CurrentUser, db: DB) -> ForkOut:
    """Fork a topic. Seeds the fork's `markdown_source` from the master's
    `content.md`. 409 if the caller already forked this topic — the body
    carries the existing fork so the frontend can redirect to it.
    """
    try:
        result = await fork_service.create_fork(db, user.id, data.topic_slug)
    except fork_service.ForkExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "You already have a fork of this topic.",
                "existing_fork_id": str(exc.existing.id),
                "username": user.display_name,
                "topic_slug": data.topic_slug,
            },
        )
    if result is None:
        raise HTTPException(status_code=404, detail=f"unknown topic: {data.topic_slug}")
    fork, topic = result
    return _fork_out(fork, topic, user)


@router.get("/me", response_model=list[ForkSummary])
async def list_my_forks(user: CurrentUser, db: DB) -> list[ForkSummary]:
    rows = await fork_service.list_my_forks(db, user.id)
    out: list[ForkSummary] = []
    for fork, topic in rows:
        # O1: per-fork latest suggestion status for the card chip. N+1 is
        # fine here — a typical user's fork count is small. Optimize when
        # fork volume warrants.
        status = await merge_service.latest_status_for_fork(db, fork.id)
        out.append(ForkSummary(
            id=fork.id,
            username=user.display_name,
            topic_slug=topic.slug,
            topic_title=topic.title,
            topic_domain=topic.domain,
            topic_difficulty=topic.difficulty,
            updated_at=fork.updated_at,
            suggestion_status=status,
        ))
    return out


@router.post("/preview", response_model=ForkPreviewOut)
async def preview_fork(data: ForkPreviewIn, user: CurrentUser) -> ForkPreviewOut:
    """Parse markdown without persisting — the editor's live-preview pane.
    Auth-required so anonymous traffic can't use it as a free parser.
    """
    blocks, misconceptions, warnings = _parse_markdown(data.markdown_source, "preview")
    return ForkPreviewOut(
        content_blocks=blocks,
        misconceptions=misconceptions,
        warnings=warnings,
    )


@router.get("/{username}", response_model=list[ForkSummary])
async def list_user_forks(username: str, db: DB) -> list[ForkSummary]:
    """A user's public fork listing. Open — no auth required."""
    rows = await fork_service.list_user_forks(db, username)
    if rows is None:
        raise HTTPException(status_code=404, detail=f"user '{username}' not found")
    out: list[ForkSummary] = []
    for fork, topic in rows:
        status = await merge_service.latest_status_for_fork(db, fork.id)
        out.append(ForkSummary(
            id=fork.id,
            username=username,
            topic_slug=topic.slug,
            topic_title=topic.title,
            topic_domain=topic.domain,
            topic_difficulty=topic.difficulty,
            updated_at=fork.updated_at,
            suggestion_status=status,
        ))
    return out


@router.get("/{username}/{slug}", response_model=ForkDetail)
async def get_fork(username: str, slug: str, db: DB) -> ForkDetail:
    """Read one fork — parsed into renderable blocks. Open — no auth."""
    result = await fork_service.get_fork(db, username, slug)
    if result is None:
        raise HTTPException(status_code=404, detail="fork not found")
    fork, owner, topic = result
    return await _fork_detail(db, fork, topic, owner)


@router.put("/{username}/{slug}", response_model=ForkDetail)
async def update_fork(
    username: str, slug: str, data: ForkUpdateIn, user: CurrentUser, db: DB
) -> ForkDetail:
    """Overwrite a fork's source. Owner-only."""
    result = await fork_service.get_fork(db, username, slug)
    if result is None:
        raise HTTPException(status_code=404, detail="fork not found")
    fork, owner, topic = result
    if fork.forked_by != user.id:
        raise HTTPException(status_code=403, detail="not your fork")
    await fork_service.update_fork_source(db, fork, data.markdown_source)
    return await _fork_detail(db, fork, topic, owner)


@router.delete("/{username}/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fork(username: str, slug: str, user: CurrentUser, db: DB) -> None:
    """Delete a fork. Owner-only."""
    result = await fork_service.get_fork(db, username, slug)
    if result is None:
        raise HTTPException(status_code=404, detail="fork not found")
    fork, _owner, _topic = result
    if fork.forked_by != user.id:
        raise HTTPException(status_code=403, detail="not your fork")
    await fork_service.delete_fork(db, fork)


@router.post("/{username}/{slug}/suggest", response_model=MergeBackSummary)
async def suggest_merge_back(
    username: str, slug: str, user: CurrentUser, db: DB
) -> MergeBackSummary:
    """Create or refresh a fork's pending merge-back suggestion. Owner-only.

    Snapshots the fork's *saved* `markdown_source` — owners save first,
    then suggest. One pending suggestion per fork; calling this while one
    is already pending updates that suggestion's snapshot in place
    (treats it as the owner revising their proposal).
    """
    result = await fork_service.get_fork(db, username, slug)
    if result is None:
        raise HTTPException(status_code=404, detail="fork not found")
    fork, owner, topic = result
    if fork.forked_by != user.id:
        raise HTTPException(status_code=403, detail="not your fork")
    suggestion = await merge_service.suggest_from_fork(db, fork, user.id)
    return MergeBackSummary(
        id=suggestion.id,
        fork_id=suggestion.fork_id,
        topic_id=suggestion.topic_id,
        topic_slug=topic.slug,
        topic_title=topic.title,
        suggested_by=suggestion.suggested_by,
        suggester_display_name=owner.display_name,
        status=suggestion.status,
        created_at=suggestion.created_at,
        updated_at=suggestion.updated_at,
    )
