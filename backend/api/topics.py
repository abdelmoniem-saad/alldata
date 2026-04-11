"""Topic routes — CRUD, search, and children."""

import uuid

from fastapi import APIRouter, HTTPException, Query, status

from backend.deps import DB, CurrentUser
from backend.models.user import UserRole
from backend.services import content_service
from backend.schemas.topic import TopicCreate, TopicDetail, TopicSummary, TopicUpdate

router = APIRouter()


@router.get("", response_model=list[TopicSummary])
async def list_topics(
    db: DB,
    domain: str | None = None,
    difficulty: str | None = None,
    status_filter: str | None = Query("published", alias="status"),
    search: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    topics = await content_service.get_topics(
        db, domain=domain, difficulty=difficulty, status=status_filter,
        search=search, limit=limit, offset=offset,
    )
    return [TopicSummary.model_validate(t) for t in topics]


@router.get("/search", response_model=list[TopicSummary])
async def search_topics(db: DB, q: str = Query(..., min_length=1)):
    topics = await content_service.search_topics(db, q)
    return [TopicSummary.model_validate(t) for t in topics]


@router.get("/{slug}", response_model=TopicDetail)
async def get_topic(slug: str, db: DB, layer: str | None = None):
    topic = await content_service.get_topic_by_slug(db, slug)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    detail = TopicDetail.model_validate(topic)

    # Filter content blocks by explanation layer if requested
    if layer and layer in ("intuition", "formal"):
        detail.content_blocks = [
            b for b in detail.content_blocks if b.layer in (layer, "both")
        ]

    return detail


@router.post("", response_model=TopicDetail, status_code=status.HTTP_201_CREATED)
async def create_topic(data: TopicCreate, db: DB, user: CurrentUser):
    if user.role not in (UserRole.CONTRIBUTOR.value, UserRole.PROFESSOR.value,
                         UserRole.EDITOR.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Contributors and above can create topics")

    topic = await content_service.create_topic(db, data, user.id)

    # Re-fetch with relationships loaded
    full_topic = await content_service.get_topic_by_slug(db, topic.slug)
    return TopicDetail.model_validate(full_topic)


@router.put("/{slug}", response_model=TopicDetail)
async def update_topic(slug: str, data: TopicUpdate, db: DB, user: CurrentUser):
    if user.role not in (UserRole.EDITOR.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Only editors and admins can update topics")

    topic = await content_service.update_topic(db, slug, data)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    full_topic = await content_service.get_topic_by_slug(db, slug)
    return TopicDetail.model_validate(full_topic)


@router.get("/{slug}/children", response_model=list[TopicSummary])
async def get_children(slug: str, db: DB):
    topic = await content_service.get_topic_by_slug(db, slug)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    from sqlalchemy import select
    from backend.models.topic import Topic

    result = await db.execute(
        select(Topic)
        .where(Topic.parent_id == topic.id)
        .order_by(Topic.sort_order)
    )
    children = result.scalars().all()
    return [TopicSummary.model_validate(c) for c in children]
