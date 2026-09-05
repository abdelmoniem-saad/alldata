"""Consolidated misconceptions catalog, C2 (the H10 backlog item).

The data has flowed through `Topic.misconceptions` and the graph's
`misconception_count` since H4 removed the inline marker; this endpoint
finally surfaces it as one public read: every misconception in the
catalog, joined to its topic, grouped client-side by topic. No auth (it
is curriculum content), no PII, one query.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from backend.deps import DB
from backend.models.misconception import Misconception
from backend.models.topic import Topic

router = APIRouter()


class MisconceptionEntry(BaseModel):
    topic_slug: str
    topic_title: str
    domain: str | None
    title: str
    wrong_belief: str
    correction: str


@router.get("", response_model=list[MisconceptionEntry])
async def list_misconceptions(db: DB):
    """Every misconception in the catalog, with its topic. Ordered by
    domain then topic so the client can group without sorting."""
    rows = await db.execute(
        select(
            Misconception.title,
            Misconception.wrong_belief,
            Misconception.correction,
            Topic.slug,
            Topic.title,
            Topic.domain,
        )
        .select_from(Misconception)
        .join(Topic, Topic.id == Misconception.topic_id)
        .where(Topic.status == "published")
        .order_by(Topic.domain, Topic.title, Misconception.sort_order)
    )
    return [
        MisconceptionEntry(
            topic_slug=slug,
            topic_title=topic_title,
            domain=domain,
            title=title,
            wrong_belief=wrong,
            correction=correction,
        )
        for title, wrong, correction, slug, topic_title, domain in rows.all()
    ]
