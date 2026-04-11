"""Graph engine — the intellectual core of AllData.

Handles prerequisite traversal, learning path generation, cycle detection,
subgraph extraction, and adaptive graph personalization.
"""

import uuid
from collections import defaultdict, deque

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.content_block import ContentBlock
from backend.models.edge import EdgeType, TopicEdge
from backend.models.progress import UserProgress
from backend.models.topic import Topic
from backend.schemas.graph import (
    GraphEdge,
    GraphNode,
    GraphResponse,
    LearningPathResponse,
    LearningPathStep,
)


async def _get_content_counts(db: AsyncSession, topic_ids: list) -> dict:
    """Get content block counts for a list of topic IDs."""
    if not topic_ids:
        return {}
    result = await db.execute(
        select(ContentBlock.topic_id, func.count(ContentBlock.id))
        .where(ContentBlock.topic_id.in_(topic_ids))
        .group_by(ContentBlock.topic_id)
    )
    return {row[0]: row[1] for row in result}


async def get_full_graph(db: AsyncSession, status_filter: str | None = "published") -> GraphResponse:
    """Return the full graph (all nodes and edges) for visualization."""
    topic_query = select(Topic)
    if status_filter:
        topic_query = topic_query.where(Topic.status == status_filter)
    result = await db.execute(topic_query)
    topics = result.scalars().all()

    edge_result = await db.execute(select(TopicEdge))
    edges = edge_result.scalars().all()

    # Get content block counts per topic to determine has_content
    content_counts_result = await db.execute(
        select(ContentBlock.topic_id, func.count(ContentBlock.id))
        .group_by(ContentBlock.topic_id)
    )
    content_counts = {row[0]: row[1] for row in content_counts_result}

    topic_ids = {t.id for t in topics}

    return GraphResponse(
        nodes=[
            GraphNode(
                id=t.id,
                slug=t.slug,
                title=t.title,
                domain=t.domain,
                difficulty=t.difficulty,
                depth=t.depth,
                status=t.status,
                has_content=content_counts.get(t.id, 0) > 0,
            )
            for t in topics
        ],
        edges=[
            GraphEdge(
                source_id=e.source_id,
                target_id=e.target_id,
                edge_type=e.edge_type,
                weight=e.weight,
                description=e.description,
            )
            for e in edges
            if e.source_id in topic_ids and e.target_id in topic_ids
        ],
    )


async def get_subgraph(
    db: AsyncSession, root_slug: str, depth: int = 2
) -> GraphResponse:
    """Return the local neighborhood of a topic up to `depth` hops."""
    # Find the root topic
    result = await db.execute(select(Topic).where(Topic.slug == root_slug))
    root = result.scalar_one_or_none()
    if not root:
        return GraphResponse(nodes=[], edges=[])

    # BFS to find all topics within `depth` hops
    visited: set[uuid.UUID] = {root.id}
    frontier: set[uuid.UUID] = {root.id}

    all_edges: list[TopicEdge] = []

    for _ in range(depth):
        if not frontier:
            break

        # Get all edges from/to the frontier
        edge_result = await db.execute(
            select(TopicEdge).where(
                (TopicEdge.source_id.in_(frontier)) | (TopicEdge.target_id.in_(frontier))
            )
        )
        edges = edge_result.scalars().all()
        all_edges.extend(edges)

        # Expand frontier
        new_frontier: set[uuid.UUID] = set()
        for edge in edges:
            if edge.source_id not in visited:
                new_frontier.add(edge.source_id)
            if edge.target_id not in visited:
                new_frontier.add(edge.target_id)

        visited.update(new_frontier)
        frontier = new_frontier

    # Fetch all visited topics
    topic_result = await db.execute(select(Topic).where(Topic.id.in_(visited)))
    topics = topic_result.scalars().all()

    # Deduplicate edges
    seen_edges: set[tuple] = set()
    unique_edges = []
    for e in all_edges:
        key = (e.source_id, e.target_id, e.edge_type)
        if key not in seen_edges:
            seen_edges.add(key)
            unique_edges.append(e)

    return GraphResponse(
        nodes=[
            GraphNode(
                id=t.id, slug=t.slug, title=t.title, domain=t.domain,
                difficulty=t.difficulty, depth=t.depth, status=t.status,
            )
            for t in topics
        ],
        edges=[
            GraphEdge(
                source_id=e.source_id, target_id=e.target_id,
                edge_type=e.edge_type, weight=e.weight, description=e.description,
            )
            for e in unique_edges
        ],
    )


async def get_prerequisite_chain(
    db: AsyncSession, topic_slug: str
) -> list[GraphNode]:
    """Return all transitive prerequisites in topological order.

    Uses a recursive CTE for efficient traversal in PostgreSQL.
    """
    # Get the topic ID first
    result = await db.execute(select(Topic).where(Topic.slug == topic_slug))
    target = result.scalar_one_or_none()
    if not target:
        return []

    # Recursive CTE to find all transitive prerequisites
    cte_query = text("""
        WITH RECURSIVE prereqs AS (
            -- Base case: direct prerequisites of the target
            SELECT e.source_id AS topic_id, 1 AS depth
            FROM topic_edges e
            WHERE e.target_id = :target_id AND e.edge_type = 'prerequisite'

            UNION

            -- Recursive case: prerequisites of prerequisites
            SELECT e.source_id AS topic_id, p.depth + 1
            FROM topic_edges e
            JOIN prereqs p ON e.target_id = p.topic_id
            WHERE e.edge_type = 'prerequisite' AND p.depth < 20
        )
        SELECT DISTINCT topic_id FROM prereqs
    """)

    prereq_result = await db.execute(cte_query, {"target_id": str(target.id)})
    prereq_ids = [row[0] for row in prereq_result.fetchall()]

    if not prereq_ids:
        return []

    # Fetch the topics
    topics_result = await db.execute(select(Topic).where(Topic.id.in_(prereq_ids)))
    topics = {t.id: t for t in topics_result.scalars().all()}

    # Get edges between these topics for topological sort
    edges_result = await db.execute(
        select(TopicEdge).where(
            TopicEdge.source_id.in_(prereq_ids),
            TopicEdge.target_id.in_(prereq_ids + [target.id]),
            TopicEdge.edge_type == EdgeType.PREREQUISITE.value,
        )
    )
    edges = edges_result.scalars().all()

    # Topological sort using Kahn's algorithm
    sorted_topics = _topological_sort(topics, edges)

    # Get content counts
    content_counts = await _get_content_counts(db, prereq_ids)

    return [
        GraphNode(
            id=t.id, slug=t.slug, title=t.title, domain=t.domain,
            difficulty=t.difficulty, depth=t.depth, status=t.status,
            has_content=content_counts.get(t.id, 0) > 0,
        )
        for t in sorted_topics
    ]


async def get_learning_path(
    db: AsyncSession, from_slug: str, to_slug: str
) -> LearningPathResponse | None:
    """Find the shortest learning path between two topics via prerequisites.

    Uses BFS on the prerequisite subgraph (traversing backward from target).
    """
    # Get both topics
    from_result = await db.execute(select(Topic).where(Topic.slug == from_slug))
    from_topic = from_result.scalar_one_or_none()

    to_result = await db.execute(select(Topic).where(Topic.slug == to_slug))
    to_topic = to_result.scalar_one_or_none()

    if not from_topic or not to_topic:
        return None

    # Load all prerequisite edges into an adjacency list
    edges_result = await db.execute(
        select(TopicEdge).where(TopicEdge.edge_type == EdgeType.PREREQUISITE.value)
    )
    edges = edges_result.scalars().all()

    # Build adjacency: prerequisite -> what it unlocks (forward direction for learning)
    forward_adj: dict[uuid.UUID, list[tuple[uuid.UUID, str | None]]] = defaultdict(list)
    for e in edges:
        forward_adj[e.source_id].append((e.target_id, e.description))

    # BFS from from_topic to to_topic in the forward direction
    queue: deque[uuid.UUID] = deque([from_topic.id])
    parent: dict[uuid.UUID, tuple[uuid.UUID | None, str | None]] = {from_topic.id: (None, None)}

    while queue:
        current = queue.popleft()
        if current == to_topic.id:
            break

        for neighbor_id, description in forward_adj.get(current, []):
            if neighbor_id not in parent:
                parent[neighbor_id] = (current, description)
                queue.append(neighbor_id)

    if to_topic.id not in parent:
        return None

    # Reconstruct path
    path_ids: list[tuple[uuid.UUID, str | None]] = []
    current = to_topic.id
    while current is not None:
        prev, desc = parent[current]
        path_ids.append((current, desc))
        current = prev
    path_ids.reverse()

    # Fetch topic details
    topic_ids = [tid for tid, _ in path_ids]
    topics_result = await db.execute(select(Topic).where(Topic.id.in_(topic_ids)))
    topics = {t.id: t for t in topics_result.scalars().all()}

    steps = []
    for i, (tid, desc) in enumerate(path_ids):
        t = topics[tid]
        steps.append(
            LearningPathStep(
                order=i,
                topic=GraphNode(
                    id=t.id, slug=t.slug, title=t.title, domain=t.domain,
                    difficulty=t.difficulty, depth=t.depth, status=t.status,
                ),
                why_needed=desc,
            )
        )

    return LearningPathResponse(
        from_topic=from_slug,
        to_topic=to_slug,
        steps=steps,
        total_topics=len(steps),
    )


async def validate_edge(
    db: AsyncSession, source_id: uuid.UUID, target_id: uuid.UUID
) -> bool:
    """Check that adding a prerequisite edge source->target won't create a cycle.

    Returns True if the edge is safe (no cycle), False if it would create one.
    Uses DFS from source following incoming prerequisite edges to see if target is reachable.
    """
    if source_id == target_id:
        return False

    # Traverse prerequisite ancestors of `source_id` and stop early if `target_id` is found.
    visited: set[uuid.UUID] = {source_id}
    frontier: set[uuid.UUID] = {source_id}

    while frontier:
        edge_result = await db.execute(
            select(TopicEdge.source_id).where(
                TopicEdge.target_id.in_(frontier),
                TopicEdge.edge_type == EdgeType.PREREQUISITE.value,
            )
        )
        ancestors = {row[0] for row in edge_result.fetchall()}

        if target_id in ancestors:
            return False

        frontier = ancestors - visited
        visited.update(frontier)

    return True


async def get_leads_to(db: AsyncSession, topic_slug: str) -> list[GraphNode]:
    """Return topics that this topic is a prerequisite for (what it unlocks)."""
    result = await db.execute(select(Topic).where(Topic.slug == topic_slug))
    topic = result.scalar_one_or_none()
    if not topic:
        return []

    edge_result = await db.execute(
        select(TopicEdge).where(
            TopicEdge.source_id == topic.id,
            TopicEdge.edge_type == EdgeType.PREREQUISITE.value,
        )
    )
    edges = edge_result.scalars().all()
    target_ids = [e.target_id for e in edges]

    if not target_ids:
        return []

    topics_result = await db.execute(select(Topic).where(Topic.id.in_(target_ids)))
    topics = topics_result.scalars().all()

    content_counts = await _get_content_counts(db, target_ids)

    return [
        GraphNode(
            id=t.id, slug=t.slug, title=t.title, domain=t.domain,
            difficulty=t.difficulty, depth=t.depth, status=t.status,
            has_content=content_counts.get(t.id, 0) > 0,
        )
        for t in topics
    ]


async def get_readiness(
    db: AsyncSession, user_id: uuid.UUID, topic_slug: str
) -> dict:
    """Check if a user is ready for a topic based on their completed prerequisites."""
    prereqs = await get_prerequisite_chain(db, topic_slug)
    if not prereqs:
        return {"ready": True, "completed": [], "missing": []}

    # Get user's completed topics
    progress_result = await db.execute(
        select(UserProgress).where(
            UserProgress.user_id == user_id,
            UserProgress.status == "completed",
        )
    )
    completed_ids = {p.topic_id for p in progress_result.scalars().all()}

    completed = [p for p in prereqs if p.id in completed_ids]
    missing = [p for p in prereqs if p.id not in completed_ids]

    return {
        "ready": len(missing) == 0,
        "completed": completed,
        "missing": missing,
    }


async def get_adaptive_graph(
    db: AsyncSession, user_id: uuid.UUID
) -> GraphResponse:
    """Return a personalized graph where completed topics are collapsed
    and struggling areas are expanded with more detail."""
    full_graph = await get_full_graph(db, status_filter="published")

    # Get user progress
    progress_result = await db.execute(
        select(UserProgress).where(UserProgress.user_id == user_id)
    )
    progress = {p.topic_id: p for p in progress_result.scalars().all()}

    # Annotate nodes with progress info
    for node in full_graph.nodes:
        p = progress.get(node.id)
        if p:
            # Add progress metadata (the frontend uses this for visual styling)
            node.status = f"{node.status}:{p.status}"

    return full_graph


def _topological_sort(
    topics: dict[uuid.UUID, Topic], edges: list[TopicEdge]
) -> list[Topic]:
    """Kahn's algorithm for topological sorting."""
    in_degree: dict[uuid.UUID, int] = defaultdict(int)
    adj: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)

    topic_ids = set(topics.keys())

    for edge in edges:
        if edge.source_id in topic_ids and edge.target_id in topic_ids:
            adj[edge.source_id].append(edge.target_id)
            in_degree[edge.target_id] += 1
            if edge.source_id not in in_degree:
                in_degree[edge.source_id] = 0

    # Start with nodes that have no incoming edges
    queue = deque([tid for tid in topic_ids if in_degree.get(tid, 0) == 0])
    result: list[Topic] = []

    while queue:
        node_id = queue.popleft()
        if node_id in topics:
            result.append(topics[node_id])

        for neighbor in adj.get(node_id, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return result
