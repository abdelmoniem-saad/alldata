"""C2 regression: the consolidated misconceptions endpoint.

The endpoint shipped with an `order_by` against a column the model doesn't
have and 500'd on the live Space on its first request. These tests call
the endpoint directly so the query is always compiled, not just written.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.misconceptions import list_misconceptions
from backend.models.misconception import Misconception
from tests.test_cycle_a import _topic


async def test_lists_published_topic_misconceptions(db: AsyncSession):
    topic = await _topic(db, "mis-published", "Mis Published")
    other = await _topic(db, "mis-other", "Mis Other")
    db.add(Misconception(
        topic_id=topic.id, title="The trap",
        wrong_belief="The wrong version.", correction="The right version.",
    ))
    db.add(Misconception(
        topic_id=other.id, title="Another trap",
        wrong_belief="Wrong again.", correction="Right again.",
    ))
    await db.flush()

    rows = await list_misconceptions(db)
    assert len(rows) == 2
    entry = next(r for r in rows if r.topic_slug == "mis-published")
    assert entry.title == "The trap"
    assert entry.wrong_belief == "The wrong version."
    assert entry.topic_title == "Mis Published"
    # Ordered by domain then topic: mis-other sorts before mis-published.
    assert [r.topic_slug for r in rows] == ["mis-other", "mis-published"]


async def test_draft_topic_misconceptions_are_hidden(db: AsyncSession):
    topic = await _topic(db, "mis-draft", "Mis Draft")
    topic.status = "draft"
    db.add(Misconception(
        topic_id=topic.id, title="Hidden trap",
        wrong_belief="Should not surface.", correction="Because draft.",
    ))
    await db.flush()

    rows = await list_misconceptions(db)
    assert all(r.topic_slug != "mis-draft" for r in rows)


async def test_no_misconceptions_returns_empty(db: AsyncSession):
    assert await list_misconceptions(db) == []
