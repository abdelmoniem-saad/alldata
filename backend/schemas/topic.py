import uuid
from datetime import datetime

from pydantic import BaseModel


class ContentBlockCreate(BaseModel):
    block_type: str
    content: str
    sort_order: int = 0
    layer: str = "both"
    expected_output: str | None = None
    is_editable: bool = False
    simulation_config: str | None = None
    hint: str | None = None
    solution: str | None = None
    anchor: str | None = None
    meta: str | None = None


class ContentBlockResponse(BaseModel):
    id: uuid.UUID
    block_type: str
    content: str
    sort_order: int
    layer: str
    expected_output: str | None
    is_editable: bool
    simulation_config: str | None
    hint: str | None
    solution: str | None
    anchor: str | None = None
    # `meta` is stored as a JSON-serialized string on the model. Returned as-is
    # so the frontend can `JSON.parse` once and route on `block_type`.
    meta: str | None = None

    model_config = {"from_attributes": True}


class MisconceptionCreate(BaseModel):
    title: str
    wrong_belief: str
    correction: str
    why_common: str | None = None


class MisconceptionResponse(BaseModel):
    id: uuid.UUID
    title: str
    wrong_belief: str
    correction: str
    why_common: str | None

    model_config = {"from_attributes": True}


class TopicCreate(BaseModel):
    slug: str
    title: str
    summary: str | None = None
    parent_id: uuid.UUID | None = None
    difficulty: str | None = None
    domain: str | None = None
    has_intuition_layer: bool = True
    has_formal_layer: bool = False
    content_blocks: list[ContentBlockCreate] = []
    misconceptions: list[MisconceptionCreate] = []


class TopicUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    difficulty: str | None = None
    domain: str | None = None
    status: str | None = None
    has_intuition_layer: bool | None = None
    has_formal_layer: bool | None = None


class TopicSummary(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    summary: str | None
    difficulty: str | None
    domain: str | None
    status: str
    depth: int

    model_config = {"from_attributes": True}


class TopicDetail(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    summary: str | None
    difficulty: str | None
    domain: str | None
    status: str
    depth: int
    has_intuition_layer: bool
    has_formal_layer: bool
    parent_id: uuid.UUID | None
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
    content_blocks: list[ContentBlockResponse]
    misconceptions: list[MisconceptionResponse]

    model_config = {"from_attributes": True}
