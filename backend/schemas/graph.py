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
    # G7: surfaces how many common misconceptions the topic documents. The
    # ForceGraph renders a small "!" marker when > 0 so the
    # "misconception-aware" identity claim is visible before entering a topic.
    misconception_count: int = 0
    # A1: search results carry where the query matched and, for body matches,
    # a short context window. Absent (None) on graph endpoints that build
    # GraphNode outside of search.
    matched_in: str | None = None
    snippet: str | None = None


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


# G8: Prerequisite / leads-to endpoints now mirror LearningPathStep's
# {topic, why_needed} shape so Zen drawers can speak the same visual
# vocabulary as /explore (tick glyph + italic "because {reason}" line).
# Direct edges carry a description; transitive prereqs from the CTE
# surface without one, which is the right behavior, only the direct
# dependency has a documented rationale.
class PrerequisiteEntry(BaseModel):
    node: GraphNode
    why: str | None
