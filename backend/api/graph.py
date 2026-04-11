"""Graph routes — visualization, paths, prerequisites, edges."""

import uuid

from fastapi import APIRouter, HTTPException, Query, status

from backend.deps import DB, CurrentUser
from backend.models.edge import TopicEdge
from backend.models.user import UserRole
from backend.schemas.graph import (
    EdgeCreate,
    EdgeResponse,
    GraphNode,
    GraphResponse,
    LearningPathResponse,
)
from backend.services import graph_engine

router = APIRouter()


@router.get("", response_model=GraphResponse)
async def get_full_graph(
    db: DB,
    status_filter: str | None = Query("published", alias="status"),
):
    """Get the full knowledge graph for visualization."""
    return await graph_engine.get_full_graph(db, status_filter=status_filter)


@router.get("/subgraph", response_model=GraphResponse)
async def get_subgraph(
    db: DB,
    root: str = Query(..., description="Slug of the root topic"),
    depth: int = Query(2, ge=1, le=5),
):
    """Get the local neighborhood of a topic."""
    return await graph_engine.get_subgraph(db, root, depth)


@router.get("/path", response_model=LearningPathResponse)
async def get_learning_path(
    db: DB,
    from_topic: str = Query(..., alias="from", description="Starting topic slug"),
    to_topic: str = Query(..., alias="to", description="Target topic slug"),
):
    """Find the shortest learning path between two topics."""
    path = await graph_engine.get_learning_path(db, from_topic, to_topic)
    if not path:
        raise HTTPException(status_code=404, detail="No learning path found between these topics")
    return path


@router.get("/prerequisites/{slug}", response_model=list[GraphNode])
async def get_prerequisites(slug: str, db: DB):
    """Get all transitive prerequisites for a topic in topological order."""
    return await graph_engine.get_prerequisite_chain(db, slug)


@router.get("/leads-to/{slug}", response_model=list[GraphNode])
async def get_leads_to(slug: str, db: DB):
    """Get topics that this topic unlocks (is a prerequisite for)."""
    return await graph_engine.get_leads_to(db, slug)


@router.get("/readiness/{slug}")
async def check_readiness(slug: str, db: DB, user: CurrentUser):
    """Check if the current user is ready for a topic based on completed prerequisites."""
    return await graph_engine.get_readiness(db, user.id, slug)


@router.get("/adaptive", response_model=GraphResponse)
async def get_adaptive_graph(db: DB, user: CurrentUser):
    """Get a personalized graph based on user progress."""
    return await graph_engine.get_adaptive_graph(db, user.id)


@router.post("/edges", response_model=EdgeResponse, status_code=status.HTTP_201_CREATED)
async def create_edge(data: EdgeCreate, db: DB, user: CurrentUser):
    """Create a new edge between two topics."""
    if user.role not in (UserRole.EDITOR.value, UserRole.ADMIN.value):
        raise HTTPException(status_code=403, detail="Only editors and admins can create edges")

    # Validate no cycle for prerequisite edges
    if data.edge_type == "prerequisite":
        is_safe = await graph_engine.validate_edge(db, data.source_id, data.target_id)
        if not is_safe:
            raise HTTPException(
                status_code=400,
                detail="This prerequisite edge would create a cycle in the graph",
            )

    edge = TopicEdge(
        source_id=data.source_id,
        target_id=data.target_id,
        edge_type=data.edge_type,
        weight=data.weight,
        description=data.description,
    )
    db.add(edge)
    await db.flush()
    return EdgeResponse.model_validate(edge)
