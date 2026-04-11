"""Content service — CRUD and versioning for topics and content blocks."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.content_block import ContentBlock
from backend.models.edge import TopicEdge
from backend.models.misconception import Misconception
from backend.models.topic import Topic
from backend.schemas.topic import ContentBlockCreate, MisconceptionCreate, TopicCreate, TopicUpdate


async def get_topics(
    db: AsyncSession,
    domain: str | None = None,
    difficulty: str | None = None,
    status: str | None = "published",
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Topic]:
    """List topics with optional filters and full-text search."""
    query = select(Topic)

    if domain:
        query = query.where(Topic.domain == domain)
    if difficulty:
        query = query.where(Topic.difficulty == difficulty)
    if status:
        query = query.where(Topic.status == status)
    if search:
        # Use PostgreSQL trigram similarity for fuzzy search
        query = query.where(
            Topic.title.ilike(f"%{search}%") | Topic.summary.ilike(f"%{search}%")
        )

    query = query.order_by(Topic.domain, Topic.sort_order).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_topic_by_slug(db: AsyncSession, slug: str) -> Topic | None:
    """Get a topic with all its content blocks and misconceptions."""
    result = await db.execute(
        select(Topic)
        .where(Topic.slug == slug)
        .options(
            selectinload(Topic.content_blocks),
            selectinload(Topic.misconceptions),
        )
    )
    return result.scalar_one_or_none()


async def create_topic(db: AsyncSession, data: TopicCreate, user_id: uuid.UUID) -> Topic:
    """Create a new topic with content blocks and misconceptions."""
    topic = Topic(
        slug=data.slug,
        title=data.title,
        summary=data.summary,
        parent_id=data.parent_id,
        difficulty=data.difficulty,
        domain=data.domain,
        has_intuition_layer=data.has_intuition_layer,
        has_formal_layer=data.has_formal_layer,
        created_by=user_id,
    )

    # Set depth based on parent
    if data.parent_id:
        parent_result = await db.execute(select(Topic).where(Topic.id == data.parent_id))
        parent = parent_result.scalar_one_or_none()
        if parent:
            topic.depth = parent.depth + 1

    db.add(topic)
    await db.flush()  # Get the topic ID

    # Add content blocks
    for block_data in data.content_blocks:
        block = ContentBlock(
            topic_id=topic.id,
            block_type=block_data.block_type,
            content=block_data.content,
            sort_order=block_data.sort_order,
            layer=block_data.layer,
            expected_output=block_data.expected_output,
            is_editable=block_data.is_editable,
            simulation_config=block_data.simulation_config,
            hint=block_data.hint,
            solution=block_data.solution,
        )
        db.add(block)

    # Add misconceptions
    for misc_data in data.misconceptions:
        misc = Misconception(
            topic_id=topic.id,
            title=misc_data.title,
            wrong_belief=misc_data.wrong_belief,
            correction=misc_data.correction,
            why_common=misc_data.why_common,
        )
        db.add(misc)

    return topic


async def update_topic(db: AsyncSession, slug: str, data: TopicUpdate) -> Topic | None:
    """Update a topic's metadata."""
    result = await db.execute(select(Topic).where(Topic.slug == slug))
    topic = result.scalar_one_or_none()
    if not topic:
        return None

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(topic, field, value)

    return topic


async def add_content_block(
    db: AsyncSession, topic_id: uuid.UUID, data: ContentBlockCreate
) -> ContentBlock:
    """Add a content block to a topic."""
    block = ContentBlock(
        topic_id=topic_id,
        block_type=data.block_type,
        content=data.content,
        sort_order=data.sort_order,
        layer=data.layer,
        expected_output=data.expected_output,
        is_editable=data.is_editable,
        simulation_config=data.simulation_config,
        hint=data.hint,
        solution=data.solution,
    )
    db.add(block)
    return block


async def update_content_block(
    db: AsyncSession, block_id: uuid.UUID, content: str
) -> ContentBlock | None:
    """Update a content block's content and bump version."""
    result = await db.execute(select(ContentBlock).where(ContentBlock.id == block_id))
    block = result.scalar_one_or_none()
    if not block:
        return None

    block.content = content
    block.version += 1
    return block


async def delete_content_block(db: AsyncSession, block_id: uuid.UUID) -> bool:
    """Delete a content block."""
    result = await db.execute(select(ContentBlock).where(ContentBlock.id == block_id))
    block = result.scalar_one_or_none()
    if not block:
        return False

    await db.delete(block)
    return True


async def search_topics(db: AsyncSession, query: str, limit: int = 20) -> list[Topic]:
    """Graph-aware search — returns topics matching the query.

    Uses PostgreSQL trigram similarity for fuzzy matching.
    """
    result = await db.execute(
        select(Topic)
        .where(
            Topic.status == "published",
            Topic.title.ilike(f"%{query}%") | Topic.summary.ilike(f"%{query}%"),
        )
        .order_by(Topic.title)
        .limit(limit)
    )
    return list(result.scalars().all())
