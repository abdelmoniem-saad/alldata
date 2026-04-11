"""Tests for the graph engine — the intellectual core of AllData."""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.edge import EdgeType, TopicEdge
from backend.models.topic import Topic, TopicStatus
from backend.services import graph_engine


async def _create_topic(db: AsyncSession, slug: str, user_id: uuid.UUID, **kwargs) -> Topic:
    topic = Topic(
        slug=slug,
        title=kwargs.get("title", slug.replace("-", " ").title()),
        domain=kwargs.get("domain", "test"),
        difficulty=kwargs.get("difficulty", "intro"),
        depth=kwargs.get("depth", 2),
        status=kwargs.get("status", TopicStatus.PUBLISHED.value),
        created_by=user_id,
    )
    db.add(topic)
    await db.flush()
    return topic


async def _create_edge(
    db: AsyncSession, source: Topic, target: Topic,
    edge_type: str = EdgeType.PREREQUISITE.value, description: str | None = None,
) -> TopicEdge:
    edge = TopicEdge(
        source_id=source.id,
        target_id=target.id,
        edge_type=edge_type,
        description=description,
    )
    db.add(edge)
    await db.flush()
    return edge


class TestGetFullGraph:
    async def test_returns_all_published_topics(self, db: AsyncSession, test_user):
        a = await _create_topic(db, "topic-a", test_user.id)
        b = await _create_topic(db, "topic-b", test_user.id)
        c = await _create_topic(db, "topic-c", test_user.id, status="draft")

        graph = await graph_engine.get_full_graph(db, status_filter="published")
        slugs = {n.slug for n in graph.nodes}
        assert "topic-a" in slugs
        assert "topic-b" in slugs
        assert "topic-c" not in slugs

    async def test_includes_edges(self, db: AsyncSession, test_user):
        a = await _create_topic(db, "topic-a", test_user.id)
        b = await _create_topic(db, "topic-b", test_user.id)
        await _create_edge(db, a, b)

        graph = await graph_engine.get_full_graph(db, status_filter="published")
        assert len(graph.edges) == 1
        assert graph.edges[0].source_id == a.id
        assert graph.edges[0].target_id == b.id


class TestSubgraph:
    async def test_returns_neighborhood(self, db: AsyncSession, test_user):
        a = await _create_topic(db, "center", test_user.id)
        b = await _create_topic(db, "neighbor-1", test_user.id)
        c = await _create_topic(db, "neighbor-2", test_user.id)
        d = await _create_topic(db, "distant", test_user.id)

        await _create_edge(db, a, b)
        await _create_edge(db, a, c)
        await _create_edge(db, c, d)

        graph = await graph_engine.get_subgraph(db, "center", depth=1)
        slugs = {n.slug for n in graph.nodes}
        assert "center" in slugs
        assert "neighbor-1" in slugs
        assert "neighbor-2" in slugs
        # distant is 2 hops away, should not appear at depth 1
        assert "distant" not in slugs

    async def test_depth_2_includes_distant(self, db: AsyncSession, test_user):
        a = await _create_topic(db, "center", test_user.id)
        b = await _create_topic(db, "neighbor", test_user.id)
        c = await _create_topic(db, "distant", test_user.id)

        await _create_edge(db, a, b)
        await _create_edge(db, b, c)

        graph = await graph_engine.get_subgraph(db, "center", depth=2)
        slugs = {n.slug for n in graph.nodes}
        assert "distant" in slugs


class TestValidateEdge:
    async def test_allows_valid_edge(self, db: AsyncSession, test_user):
        a = await _create_topic(db, "a", test_user.id)
        b = await _create_topic(db, "b", test_user.id)

        is_safe = await graph_engine.validate_edge(db, a.id, b.id)
        assert is_safe is True

    async def test_detects_self_loop(self, db: AsyncSession, test_user):
        a = await _create_topic(db, "a", test_user.id)

        is_safe = await graph_engine.validate_edge(db, a.id, a.id)
        assert is_safe is False

    async def test_detects_direct_cycle(self, db: AsyncSession, test_user):
        a = await _create_topic(db, "a", test_user.id)
        b = await _create_topic(db, "b", test_user.id)
        await _create_edge(db, a, b)

        # Adding b->a would create cycle: a->b->a
        is_safe = await graph_engine.validate_edge(db, b.id, a.id)
        assert is_safe is False

    async def test_detects_indirect_cycle(self, db: AsyncSession, test_user):
        a = await _create_topic(db, "a", test_user.id)
        b = await _create_topic(db, "b", test_user.id)
        c = await _create_topic(db, "c", test_user.id)
        await _create_edge(db, a, b)
        await _create_edge(db, b, c)

        # Adding c->a would create cycle: a->b->c->a
        is_safe = await graph_engine.validate_edge(db, c.id, a.id)
        assert is_safe is False


class TestLeadsTo:
    async def test_returns_unlocked_topics(self, db: AsyncSession, test_user):
        a = await _create_topic(db, "prereq", test_user.id)
        b = await _create_topic(db, "unlocked-1", test_user.id)
        c = await _create_topic(db, "unlocked-2", test_user.id)

        await _create_edge(db, a, b)
        await _create_edge(db, a, c)

        leads = await graph_engine.get_leads_to(db, "prereq")
        slugs = {n.slug for n in leads}
        assert slugs == {"unlocked-1", "unlocked-2"}

    async def test_empty_for_leaf_topic(self, db: AsyncSession, test_user):
        a = await _create_topic(db, "leaf", test_user.id)
        leads = await graph_engine.get_leads_to(db, "leaf")
        assert leads == []
