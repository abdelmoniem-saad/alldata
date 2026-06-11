"""Service-layer tests for the fork model (N) and merge-back flow (O1)."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.topic import Topic, TopicStatus
from backend.services import fork_service, merge_service
from backend.services.fork_service import ForkExistsError


async def _topic(db: AsyncSession, slug: str, user_id: uuid.UUID, domain: str = "test") -> Topic:
    t = Topic(
        slug=slug,
        title=slug.replace("-", " ").title(),
        domain=domain,
        difficulty="intro",
        depth=2,
        status=TopicStatus.PUBLISHED.value,
        created_by=user_id,
    )
    db.add(t)
    await db.flush()
    return t


class TestCreateFork:
    async def test_create_returns_fork_and_topic(self, db, test_user):
        await _topic(db, "forkable", test_user.id)
        result = await fork_service.create_fork(db, test_user.id, "forkable")
        assert result is not None
        fork, topic = result
        assert fork.original_topic_id == topic.id
        assert fork.forked_by == test_user.id

    async def test_missing_topic_returns_none(self, db, test_user):
        assert await fork_service.create_fork(db, test_user.id, "ghost") is None

    async def test_duplicate_fork_raises_with_existing(self, db, test_user):
        await _topic(db, "once-only", test_user.id)
        first, _ = await fork_service.create_fork(db, test_user.id, "once-only")
        with pytest.raises(ForkExistsError) as exc:
            await fork_service.create_fork(db, test_user.id, "once-only")
        assert exc.value.existing.id == first.id

    async def test_seed_topic_fork_carries_real_source(self, db, test_user):
        # A slug that exists on disk under seed/topics — the fork should be
        # seeded with the actual content.md, not an empty string.
        await _topic(db, "variance", test_user.id, domain="probability-foundations")
        fork, _ = await fork_service.create_fork(db, test_user.id, "variance")
        assert "block:" in fork.markdown_source  # real directives came along

    async def test_non_seed_topic_fork_is_empty(self, db, test_user):
        await _topic(db, "user-authored-thing", test_user.id)
        fork, _ = await fork_service.create_fork(db, test_user.id, "user-authored-thing")
        assert fork.markdown_source == ""


class TestUpdateFork:
    async def test_update_overwrites_source(self, db, test_user):
        await _topic(db, "editable", test_user.id)
        fork, _ = await fork_service.create_fork(db, test_user.id, "editable")
        updated = await fork_service.update_fork_source(db, fork, "# My rewrite")
        assert updated.markdown_source == "# My rewrite"


class TestMergeBack:
    async def _forked(self, db, user, slug: str = "mergeable"):
        topic = await _topic(db, slug, user.id)
        fork, _ = await fork_service.create_fork(db, user.id, slug)
        await fork_service.update_fork_source(db, fork, "# Proposed rewrite\n\nBetter prose.")
        return topic, fork

    async def test_suggest_snapshots_fork_source(self, db, test_user):
        _, fork = await self._forked(db, test_user)
        sug = await merge_service.suggest_from_fork(db, fork, test_user.id)
        assert sug.status == "pending"
        assert sug.suggested_markdown == "# Proposed rewrite\n\nBetter prose."

        # Later fork edits must NOT mutate the pending snapshot...
        await fork_service.update_fork_source(db, fork, "# Changed again")
        assert sug.suggested_markdown == "# Proposed rewrite\n\nBetter prose."

    async def test_re_suggest_updates_pending_in_place(self, db, test_user):
        _, fork = await self._forked(db, test_user)
        first = await merge_service.suggest_from_fork(db, fork, test_user.id)
        await fork_service.update_fork_source(db, fork, "# Revised proposal")
        second = await merge_service.suggest_from_fork(db, fork, test_user.id)
        assert second.id == first.id  # same pending row, refreshed
        assert second.suggested_markdown == "# Revised proposal"

    async def test_review_queue_lists_pending(self, db, test_user):
        _, fork = await self._forked(db, test_user)
        await merge_service.suggest_from_fork(db, fork, test_user.id)
        queue = await merge_service.list_review_queue(db)
        assert len(queue) == 1
        assert queue[0]["status"] == "pending"
        assert queue[0]["topic_slug"] == "mergeable"
        assert queue[0]["suggester_display_name"] == test_user.display_name
