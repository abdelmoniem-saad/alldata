"""C2 regression: the consolidated misconceptions endpoint.

The endpoint first shipped reading the `misconceptions` table (empty on
every real DB: the whole catalog authors misconceptions as inline blocks)
and then with an `order_by` on a column the model doesn't have; both
500'd or blanked only on the live Space. These tests call the endpoint
directly against `misconception_inline` blocks, its actual source of
truth, so the query always compiles and the body parsing is pinned.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.misconceptions import list_misconceptions, parse_inline_misconception
from backend.models.content_block import ContentBlock
from tests.test_cycle_a import _topic

_INLINE_BODY = (
    '**"Correlation implies causation."**\n\n'
    '*Wrong:* if r is high, X causes Y.\n\n'
    '*Correct:* high correlation can come from a common cause. '
    'See [**independence**](/topic/independence).'
)


async def _inline_misconception(db: AsyncSession, topic, body: str = _INLINE_BODY) -> None:
    db.add(ContentBlock(
        topic_id=topic.id, block_type="misconception_inline",
        sort_order=99, content=body,
    ))
    await db.flush()


def test_parse_inline_misconception_splits_sections():
    title, wrong, correct = parse_inline_misconception(_INLINE_BODY)
    assert title == "Correlation implies causation."
    assert wrong.startswith("if r is high")
    assert "common cause" in correct
    assert "Correct:" not in correct


def test_parse_inline_misconception_tolerates_garbage():
    title, wrong, correct = parse_inline_misconception("no markers here")
    assert title == "Common misconception"
    assert wrong == ""
    assert correct == ""


async def test_lists_published_topic_misconceptions(db: AsyncSession):
    topic = await _topic(db, "mis-published", "Mis Published")
    other = await _topic(db, "mis-other", "Mis Other")
    await _inline_misconception(db, topic)
    await _inline_misconception(db, other)

    rows = await list_misconceptions(db)
    assert len(rows) == 2
    entry = next(r for r in rows if r.topic_slug == "mis-published")
    assert entry.title == "Correlation implies causation."
    assert entry.wrong_belief.startswith("if r is high")
    assert entry.topic_title == "Mis Published"
    # Ordered by domain then topic: mis-other sorts before mis-published.
    assert [r.topic_slug for r in rows] == ["mis-other", "mis-published"]


async def test_draft_topic_misconceptions_are_hidden(db: AsyncSession):
    topic = await _topic(db, "mis-draft", "Mis Draft")
    topic.status = "draft"
    await _inline_misconception(db, topic)

    rows = await list_misconceptions(db)
    assert all(r.topic_slug != "mis-draft" for r in rows)


async def test_no_misconceptions_returns_empty(db: AsyncSession):
    assert await list_misconceptions(db) == []
