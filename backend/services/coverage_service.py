"""Content coverage report, B3.

Answers "what should I write next?" from the database, not from memory:
per-topic interactive-block coverage (decision / playground / code), graph
connectivity (nothing builds on this topic), metadata completeness (recall
prompt, summary), and distribution stats per domain + difficulty.

One implementation, two consumers: `seed.import_seed --report` prints it
after an import, and `GET /api/admin/coverage` (ADMIN) serves it to the
frontend's `/admin/coverage` page. Both are read-only — the report is a
lens, never a mutation.
"""

from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.content_block import ContentBlock
from backend.models.edge import TopicEdge
from backend.models.topic import Topic

INTERACTIVE_TYPES = {"decision", "playground"}
CODE_TYPES = {"code_python", "code_r", "simulation"}


def _blank_topic_row(topic: Topic) -> dict:
    return {
        "slug": topic.slug,
        "title": topic.title,
        "domain": topic.domain,
        "difficulty": topic.difficulty,
        "depth": topic.depth,
        "status": topic.status,
        "has_intuition_layer": bool(topic.has_intuition_layer),
        "has_formal_layer": bool(topic.has_formal_layer),
        "has_recall_prompt": bool(topic.recall_prompt),
        "has_summary": bool(topic.summary),
        "block_count": 0,
        "has_decision": False,
        "has_playground": False,
        "has_code": False,
        "has_plot": False,
        "prereq_count": 0,      # topics this one requires
        "required_by_count": 0, # topics that require this one
    }


async def build_coverage_report(db: AsyncSession) -> dict:
    """Compute the full coverage report from the live database."""
    topics = (await db.execute(select(Topic))).scalars().all()
    rows: dict = {}
    for t in topics:
        rows[t.id] = _blank_topic_row(t)

    # Block coverage per topic, one grouped query.
    block_counts = await db.execute(
        select(ContentBlock.topic_id, ContentBlock.block_type, func.count())
        .group_by(ContentBlock.topic_id, ContentBlock.block_type)
    )
    for topic_id, block_type, count in block_counts.all():
        row = rows.get(topic_id)
        if row is None:
            continue
        row["block_count"] += count
        if block_type == "decision":
            row["has_decision"] = True
        elif block_type == "playground":
            row["has_playground"] = True
        elif block_type in CODE_TYPES:
            row["has_code"] = True
        elif block_type == "plot":
            row["has_plot"] = True

    # Graph connectivity from prerequisite edges.
    edges = (await db.execute(
        select(TopicEdge.source_id, TopicEdge.target_id)
        .where(TopicEdge.edge_type == "prerequisite")
    )).all()
    for source_id, target_id in edges:
        if source_id in rows:
            rows[source_id]["required_by_count"] += 1
        if target_id in rows:
            rows[target_id]["prereq_count"] += 1

    published = [r for r in rows.values() if r["status"] == "published"]
    roots = [r for r in published if r["depth"] == 0]
    leaf_published = [r for r in published if r["depth"] > 0]

    # Gap lists (published, real content only — domain roots excluded).
    gaps = {
        "no_decision": sorted(r["slug"] for r in leaf_published if not r["has_decision"]),
        "no_playground": sorted(r["slug"] for r in leaf_published if not r["has_playground"]),
        "no_code": sorted(r["slug"] for r in leaf_published if not r["has_code"]),
        "no_recall_prompt": sorted(r["slug"] for r in leaf_published if not r["has_recall_prompt"]),
        "no_summary": sorted(r["slug"] for r in leaf_published if not r["has_summary"]),
        # "Orphans": published, real topics that nothing builds on. Not wrong
        # for deliberate leaf/advanced topics — but a cluster of them usually
        # means the follow-on content hasn't been written yet.
        "orphans": sorted(
            r["slug"] for r in leaf_published if r["required_by_count"] == 0
        ),
    }

    by_domain = Counter(r["domain"] or "—" for r in leaf_published)
    by_difficulty = Counter(r["difficulty"] or "—" for r in leaf_published)
    datasets = sorted({r for r in (t.dataset for t in topics) if r})

    n = len(leaf_published) or 1
    summary = {
        "topics_total": len(rows),
        "domains_total": len(by_domain),
        "published_total": len(published),
        "content_topics": len(leaf_published),
        "domain_roots": len(roots),
        "by_domain": dict(sorted(by_domain.items())),
        "by_difficulty": dict(sorted(by_difficulty.items())),
        "datasets_in_use": datasets,
        "coverage": {
            "decision": f"{sum(1 for r in leaf_published if r['has_decision'])}/{n}",
            "playground": f"{sum(1 for r in leaf_published if r['has_playground'])}/{n}",
            "code": f"{sum(1 for r in leaf_published if r['has_code'])}/{n}",
            "recall_prompt": f"{sum(1 for r in leaf_published if r['has_recall_prompt'])}/{n}",
            "formal_layer": f"{sum(1 for r in leaf_published if r['has_formal_layer'])}/{n}",
        },
        "gap_counts": {k: len(v) for k, v in gaps.items()},
    }

    return {
        "summary": summary,
        "gaps": gaps,
        "topics": sorted(
            leaf_published, key=lambda r: (r["domain"] or "", r["slug"])
        ),
    }


def format_report_text(report: dict) -> str:
    """Render the report for the CLI (`seed.import_seed --report`).

    ASCII-only: redirected Windows consoles default to cp1252, which
    rejects box-drawing/ellipsis characters (a UnicodeEncodeError here
    would kill the report after the import succeeded).
    """
    s = report["summary"]
    g = report["gaps"]
    lines: list[str] = []
    lines.append("")
    lines.append("=" * 28 + " Content coverage report " + "=" * 28)
    lines.append(
        f"topics: {s['content_topics']} content / {s['domain_roots']} domain roots "
        f"across {s['domains_total']} domains"
    )
    lines.append("by domain:      " + ", ".join(f"{k} ({v})" for k, v in s["by_domain"].items()))
    lines.append(
        "by difficulty:  "
        + ", ".join(f"{k} ({v})" for k, v in s["by_difficulty"].items())
    )
    lines.append(f"datasets in use: {', '.join(s['datasets_in_use']) or 'none'}")
    lines.append("")
    lines.append("interactive coverage (published content topics):")
    for label, value in s["coverage"].items():
        lines.append(f"  {label:<14} {value}")
    lines.append("")
    lines.append("gaps:")
    for label, slugs in g.items():
        count = len(slugs)
        shown = ", ".join(slugs[:8])
        more = f" ... +{count - 8} more" if count > 8 else ""
        lines.append(f"  {label:<16} {count:>3}  {shown}{more}")
    lines.append("")
    return "\n".join(lines)
