"""Consolidated misconceptions catalog, C2 (the H10 backlog item).

Source of truth: the `misconception_inline` content blocks. Every topic
authors misconceptions as inline blocks (the legacy non-inline form that
populated the `misconceptions` table is unused by the whole catalog), so
the catalog reads the same rows the topic pages render. One public query,
joined to published topics, parsed into title / wrong belief / correction.
No auth, no PII.
"""

import re

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from backend.deps import DB
from backend.models.content_block import ContentBlock
from backend.models.topic import Topic

router = APIRouter()

_BOLD_TITLE = re.compile(r"\*\*(.+?)\*\*", re.S)
_WRONG = re.compile(r"\*Wrong:\*\s*(.*?)(?=\n\s*\*Correct:\*|\Z)", re.S)
_CORRECT = re.compile(r"\*Correct:\*\s*(.*)", re.S)


def parse_inline_misconception(body: str) -> tuple[str, str, str]:
    """Split an inline misconception's markdown body into (title, wrong,
    correct). Bodies follow the authoring convention: a bolded wrong belief
    statement, then *Wrong:* and *Correct:* paragraphs. Tolerant of missing
    pieces (empty strings), never raises."""
    title_m = _BOLD_TITLE.search(body)
    title = title_m.group(1).strip().strip('"').strip() if title_m else "Common misconception"
    wrong_m = _WRONG.search(body)
    correct_m = _CORRECT.search(body)
    wrong = wrong_m.group(1).strip() if wrong_m else ""
    correct = correct_m.group(1).strip() if correct_m else ""
    return title, wrong, correct


class MisconceptionEntry(BaseModel):
    topic_slug: str
    topic_title: str
    domain: str | None
    title: str
    wrong_belief: str
    correction: str


@router.get("", response_model=list[MisconceptionEntry])
async def list_misconceptions(db: DB):
    """Every inline misconception in the catalog, with its topic. Ordered
    by domain then topic then block order so the client can group without
    sorting."""
    rows = await db.execute(
        select(
            ContentBlock.content,
            Topic.slug,
            Topic.title,
            Topic.domain,
        )
        .select_from(ContentBlock)
        .join(Topic, Topic.id == ContentBlock.topic_id)
        .where(
            Topic.status == "published",
            ContentBlock.block_type == "misconception_inline",
        )
        .order_by(Topic.domain, Topic.title, ContentBlock.sort_order)
    )
    out: list[MisconceptionEntry] = []
    for body, slug, topic_title, domain in rows.all():
        title, wrong, correct = parse_inline_misconception(body)
        out.append(MisconceptionEntry(
            topic_slug=slug,
            topic_title=topic_title,
            domain=domain,
            title=title,
            wrong_belief=wrong,
            correction=correct,
        ))
    return out
