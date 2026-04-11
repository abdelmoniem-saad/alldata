"""Course routes — create, fork, and manage courses."""

import uuid

from fastapi import APIRouter, HTTPException, Query, status

from backend.deps import DB, CurrentUser
from backend.models.user import UserRole
from backend.schemas.course import (
    CourseCreate,
    CourseDetailResponse,
    CourseResponse,
    CourseTopicAdd,
    CourseTopicMappingResponse,
)
from backend.schemas.topic import TopicSummary
from backend.services import course_service

router = APIRouter()


@router.get("", response_model=list[CourseResponse])
async def list_courses(
    db: DB,
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    courses = await course_service.list_courses(db, limit=limit, offset=offset)
    return [CourseResponse.model_validate(c) for c in courses]


@router.get("/{course_id}", response_model=CourseDetailResponse)
async def get_course(course_id: uuid.UUID, db: DB):
    course = await course_service.get_course(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    topics = []
    for mapping in course.topic_mappings:
        topics.append(CourseTopicMappingResponse(
            topic=TopicSummary.model_validate(mapping.topic),
            week_number=mapping.week_number,
            sort_order=mapping.sort_order,
            override_notes=mapping.override_notes,
            office_hours_note=mapping.office_hours_note,
        ))

    return CourseDetailResponse(
        **CourseResponse.model_validate(course).model_dump(),
        topics=topics,
    )


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(data: CourseCreate, db: DB, user: CurrentUser):
    if user.role not in (UserRole.PROFESSOR.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Only professors can create courses")

    course = await course_service.create_course(db, data, user.id)
    await db.flush()
    return CourseResponse.model_validate(course)


@router.post("/{course_id}/topics", status_code=status.HTTP_201_CREATED)
async def add_topic(course_id: uuid.UUID, data: CourseTopicAdd, db: DB, user: CurrentUser):
    if user.role not in (UserRole.PROFESSOR.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Only professors can modify courses")

    await course_service.add_topic_to_course(db, course_id, data)
    return {"status": "ok"}


@router.post("/{course_id}/fork", response_model=CourseResponse)
async def fork_course(course_id: uuid.UUID, db: DB, user: CurrentUser):
    if user.role not in (UserRole.PROFESSOR.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Only professors can fork courses")

    course = await course_service.fork_course(db, course_id, user.id)
    await db.flush()
    return CourseResponse.model_validate(course)


@router.post("/{course_id}/topics/{topic_id}/fork")
async def fork_topic_in_course(
    course_id: uuid.UUID, topic_id: uuid.UUID, db: DB, user: CurrentUser
):
    if user.role not in (UserRole.PROFESSOR.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Only professors can fork topics")

    fork = await course_service.fork_topic_in_course(db, course_id, topic_id, user.id)
    await db.flush()
    return {"fork_id": str(fork.id), "status": "ok"}
