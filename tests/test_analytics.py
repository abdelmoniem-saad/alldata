"""A10: first-party usage analytics.

Covers the beacon endpoint (kinds whitelist, slug validation, rate limit)
and the admin aggregation surface. The privacy posture is asserted too:
events carry only {kind, slug, day, count}.
"""

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models.usage import UsageEvent
from tests.test_cycle_a import _headers, _topic


class TestTrackEndpoint:
    @staticmethod
    async def _track(client: AsyncClient, kind: str, slug: str):
        return await client.post("/api/track", json={"kind": kind, "slug": slug})

    async def test_record_and_aggregate(
        self, client: AsyncClient, test_user, db: AsyncSession
    ):
        await _topic(db, "tracked-topic", "Tracked Topic")
        await db.commit()

        assert (await self._track(client, "topic_view", "tracked-topic")).status_code == 204
        assert (await self._track(client, "topic_view", "tracked-topic")).status_code == 204
        assert (await self._track(client, "run_click", "tracked-topic")).status_code == 204

        resp = await client.get("/api/admin/analytics", headers=_headers(test_user))
        assert resp.status_code == 200
        body = resp.json()
        entry = next(t for t in body["topics"] if t["slug"] == "tracked-topic")
        assert entry["views"] == 2
        assert entry["runs"] == 1
        assert body["totals"]["topic_view"] == 2

    async def test_unknown_slug_404(self, client: AsyncClient):
        resp = await self._track(client, "topic_view", "not-a-topic")
        assert resp.status_code == 404

    async def test_invalid_kind_422(self, client: AsyncClient):
        resp = await self._track(client, "scroll_depth", "anything")
        assert resp.status_code == 422

    async def test_rate_limit(self, client: AsyncClient, db: AsyncSession, monkeypatch):
        monkeypatch.setattr(settings, "track_rate_limit", 2)
        await _topic(db, "ratelimit-topic", "Rate Limit Topic")
        await db.commit()

        assert (await self._track(client, "topic_view", "ratelimit-topic")).status_code == 204
        assert (await self._track(client, "topic_view", "ratelimit-topic")).status_code == 204
        blocked = await self._track(client, "topic_view", "ratelimit-topic")
        assert blocked.status_code == 429
        assert "retry-after" in blocked.headers

    async def test_rows_carry_no_pii(self, client: AsyncClient, db: AsyncSession):
        await _topic(db, "pii-topic", "PII Topic")
        await db.commit()
        await self._track(client, "topic_view", "pii-topic")
        rows = (await db.execute(select(UsageEvent))).scalars().all()
        assert len(rows) == 1
        stored = set(rows[0].__dict__.keys())
        # Privacy posture: nothing identifying is stored, ever.
        assert stored & {"ip", "user_id", "session", "user_agent"} == set()
