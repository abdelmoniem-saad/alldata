"""B3: content coverage report tests.

Fixtures build a tiny three-topic graph (root → full → orphan) and pin the
report's semantics: interactive-block detection, orphan identification via
prerequisite edges, gap lists, and distribution stats.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.content_block import ContentBlock
from backend.models.edge import TopicEdge
from backend.models.topic import Topic
from backend.services.coverage_service import build_coverage_report, format_report_text
from tests.test_cycle_a import _author


async def _topic(db: AsyncSession, slug: str, title: str, depth: int = 1,
                 difficulty: str = "intermediate", recall_prompt: str | None = None) -> Topic:
    author = await _author(db)
    topic = Topic(
        slug=slug, title=title, domain="probability-foundations",
        difficulty=difficulty, status="published", depth=depth,
        created_by=author.id, recall_prompt=recall_prompt,
        summary=f"Summary of {title}",
    )
    db.add(topic)
    await db.flush()
    return topic


async def _block(db: AsyncSession, topic: Topic, block_type: str, content: str = "x") -> None:
    db.add(ContentBlock(topic_id=topic.id, block_type=block_type, sort_order=0, content=content))
    await db.flush()


class TestCoverageReport:
    async def test_full_topic_vs_orphan(self, db: AsyncSession):
        await _author(db)

        root = await _topic(db, "cov-root", "Cov Root", depth=0)
        full = await _topic(
            db, "cov-full", "Cov Full",
            recall_prompt="What did we cover?",
        )
        orphan = await _topic(db, "cov-orphan", "Cov Orphan")

        # Full topic: decision + playground + code + a prerequisite from root.
        await _block(db, full, "markdown", "prose")
        await _block(db, full, "decision", "pick one")
        await _block(db, full, "playground", "try it")
        await _block(db, full, "code_python", "print(1)")
        # Orphan: markdown only, no incoming prerequisite.
        await _block(db, orphan, "markdown", "lonely prose")
        # Root: connect root → full (root is prerequisite of full).
        db.add(TopicEdge(
            source_id=root.id, target_id=full.id, edge_type="prerequisite",
        ))
        await db.flush()

        report = await build_coverage_report(db)

        rows = {r["slug"]: r for r in report["topics"]}
        assert rows["cov-full"]["has_decision"] is True
        assert rows["cov-full"]["has_playground"] is True
        assert rows["cov-full"]["has_code"] is True
        assert rows["cov-full"]["has_recall_prompt"] is True
        assert rows["cov-full"]["prereq_count"] == 1      # requires cov-root
        assert rows["cov-full"]["required_by_count"] == 0

        assert rows["cov-orphan"]["has_decision"] is False
        assert rows["cov-orphan"]["required_by_count"] == 0
        # Domain roots are excluded from the per-topic detail entirely.
        assert "cov-root" not in rows

        # Orphan list: nothing builds on cov-orphan; cov-full is built on by none
        # either, but cov-root is not an orphan (cov-full requires it) — and
        # domain roots (depth 0) are excluded from gap lists entirely.
        assert "cov-orphan" in report["gaps"]["orphans"]
        assert "cov-root" not in report["gaps"]["orphans"]
        assert "cov-full" not in report["gaps"]["no_decision"]
        assert "cov-orphan" in report["gaps"]["no_decision"]
        assert "cov-orphan" in report["gaps"]["no_code"]
        assert "cov-orphan" in report["gaps"]["no_recall_prompt"]
        assert "cov-orphan" not in report["gaps"]["no_summary"]

        summary = report["summary"]
        assert summary["content_topics"] == 2   # root (depth 0) excluded
        assert summary["domain_roots"] == 1
        assert summary["by_domain"] == {"probability-foundations": 2}

        # CLI rendering mentions the key numbers without crashing.
        text = format_report_text(report)
        assert "Content coverage report" in text
        assert "cov-orphan" in text

    async def test_terminal_topic_is_not_an_orphan(self, db: AsyncSession):
        """C1: a schema-declared terminal is an intentional chain endpoint.
        It still has required_by_count == 0, but the lens reports it under
        `terminals` so the orphan list only ever means a real content gap."""
        cap = await _topic(db, "term-cap", "Terminal Capstone")
        cap.terminal = True
        await _block(db, cap, "markdown", "capstone prose")

        report = await build_coverage_report(db)

        assert "term-cap" in report["gaps"]["terminals"]
        assert "term-cap" not in report["gaps"]["orphans"]
        # Untreated topics keep the old semantics.
        assert "cov-orphan" not in report["gaps"].get("terminals", [])

    async def test_empty_database(self, db: AsyncSession):
        report = await build_coverage_report(db)
        assert report["summary"]["content_topics"] == 0
        assert report["gaps"]["orphans"] == []
        assert report["summary"]["coverage"]["decision"] == "0/1"  # 0/len(0)→1 guard
