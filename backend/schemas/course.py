import uuid
from datetime import datetime

from pydantic import BaseModel

from backend.schemas.topic import TopicSummary


class CourseCreate(BaseModel):
    title: str
    description: str | None = None
    institution: str | None = None
    semester: str | None = None
    is_public: bool = False


class CourseTopicAdd(BaseModel):
    topic_id: uuid.UUID
    week_number: int | None = None
    sort_order: int = 0
    override_notes: str | None = None


class CourseTopicMappingResponse(BaseModel):
    topic: TopicSummary
    week_number: int | None
    sort_order: int
    override_notes: str | None
    office_hours_note: str | None

    model_config = {"from_attributes": True}


class CourseResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    institution: str | None
    semester: str | None
    is_public: bool
    forked_from: uuid.UUID | None
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class CourseDetailResponse(CourseResponse):
    topics: list[CourseTopicMappingResponse] = []
