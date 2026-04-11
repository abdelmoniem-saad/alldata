"""Course service — course creation, forking, and topic management."""

import json
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.content_block import ContentBlock
from backend.models.course import Course, CourseTopicMapping
from backend.models.fork import TopicFork
from backend.models.topic import Topic
from backend.schemas.course import CourseCreate, CourseTopicAdd


async def list_courses(
    db: AsyncSession, public_only: bool = True, limit: int = 50, offset: int = 0
) -> list[Course]:
    query = select(Course)
    if public_only:
        query = query.where(Course.is_public == True)
    query = query.order_by(Course.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_course(db: AsyncSession, course_id: uuid.UUID) -> Course | None:
    result = await db.execute(
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.topic_mappings).selectinload(CourseTopicMapping.topic))
    )
    return result.scalar_one_or_none()


async def create_course(db: AsyncSession, data: CourseCreate, user_id: uuid.UUID) -> Course:
    course = Course(
        title=data.title,
        description=data.description,
        institution=data.institution,
        semester=data.semester,
        is_public=data.is_public,
        created_by=user_id,
    )
    db.add(course)
    return course


async def add_topic_to_course(
    db: AsyncSession, course_id: uuid.UUID, data: CourseTopicAdd
) -> CourseTopicMapping:
    mapping = CourseTopicMapping(
        course_id=course_id,
        topic_id=data.topic_id,
        week_number=data.week_number,
        sort_order=data.sort_order,
        override_notes=data.override_notes,
    )
    db.add(mapping)
    return mapping


async def fork_course(db: AsyncSession, course_id: uuid.UUID, user_id: uuid.UUID) -> Course:
    """Fork an entire course, copying all topic mappings."""
    original = await get_course(db, course_id)
    if not original:
        raise ValueError("Course not found")

    new_course = Course(
        title=f"{original.title} (Fork)",
        description=original.description,
        institution=None,
        semester=None,
        is_public=False,
        forked_from=original.id,
        created_by=user_id,
    )
    db.add(new_course)
    await db.flush()

    # Copy topic mappings
    for mapping in original.topic_mappings:
        new_mapping = CourseTopicMapping(
            course_id=new_course.id,
            topic_id=mapping.topic_id,
            week_number=mapping.week_number,
            sort_order=mapping.sort_order,
            override_notes=mapping.override_notes,
        )
        db.add(new_mapping)

    return new_course


async def fork_topic_in_course(
    db: AsyncSession,
    course_id: uuid.UUID,
    topic_id: uuid.UUID,
    user_id: uuid.UUID,
) -> TopicFork:
    """Fork a single topic within a course for professor customization.

    Creates a private snapshot of the topic's content blocks that the professor
    can modify without affecting the canonical graph.
    """
    # Get the topic with content blocks
    result = await db.execute(
        select(Topic)
        .where(Topic.id == topic_id)
        .options(selectinload(Topic.content_blocks))
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise ValueError("Topic not found")

    # Snapshot content blocks as JSON
    snapshot = [
        {
            "block_type": b.block_type,
            "content": b.content,
            "sort_order": b.sort_order,
            "layer": b.layer,
            "expected_output": b.expected_output,
            "is_editable": b.is_editable,
        }
        for b in topic.content_blocks
    ]

    fork = TopicFork(
        original_topic_id=topic_id,
        forked_by=user_id,
        course_id=course_id,
        content_snapshot=json.dumps(snapshot),
    )
    db.add(fork)
    return fork
