import uuid

from pydantic import BaseModel


class EdgeCreate(BaseModel):
    source_id: uuid.UUID
    target_id: uuid.UUID
    edge_type: str
    weight: float = 1.0
    description: str | None = None  # "Why do I need this?"


class EdgeResponse(BaseModel):
    id: uuid.UUID
    source_id: uuid.UUID
    target_id: uuid.UUID
    edge_type: str
    weight: float
    description: str | None

    model_config = {"from_attributes": True}


class GraphNode(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    domain: str | None
    difficulty: str | None
    depth: int
    status: str
    has_content: bool = False


class GraphEdge(BaseModel):
    source_id: uuid.UUID
    target_id: uuid.UUID
    edge_type: str
    weight: float
    description: str | None


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class LearningPathStep(BaseModel):
    order: int
    topic: GraphNode
    why_needed: str | None  # From the edge description


class LearningPathResponse(BaseModel):
    from_topic: str
    to_topic: str
    steps: list[LearningPathStep]
    total_topics: int
