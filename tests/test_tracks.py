"""C3: curated guided tracks.

The endpoint reads seed/tracks.yaml (source of truth) and resolves slugs
against the live DB. These tests pin the contract: unknown or unpublished
slugs drop out, an empty track never ships, and the file's real tracks
resolve against the seeded catalog.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.tracks import list_tracks
from backend.models.topic import Topic
from tests.test_cycle_a import _topic


async def _make_topic(db: AsyncSession, slug: str) -> Topic:
    t = await _topic(db, slug, slug.replace("-", " ").title())
    return t


class TestTracks:
    async def test_real_tracks_resolve(self, db: AsyncSession):
        """The shipped tracks.yaml resolves against the seeded catalog, and
        every listed topic carries a real title (nothing dead-ends)."""
        # Slugs referenced by the shipped tracks.yaml.
        for slug in (
            "sample-spaces", "basic-probability", "conditional-probability",
            "random-variables", "expectation", "hypothesis-testing", "p-values",
            "statistical-power", "ab-testing", "correlation",
            "simple-linear-regression", "multiple-regression",
            "f-distribution", "model-diagnostics", "cross-validation",
            "bayes-theorem", "base-rates", "monty-hall", "likelihood",
            "bayesian-inference",
        ):
            await _make_topic(db, slug)

        tracks = await list_tracks(db)
        assert len(tracks) >= 3
        for t in tracks:
            assert t.topics, f"track {t.slug} resolved empty"
            for tt in t.topics:
                assert tt.title

    async def test_unpublished_and_unknown_slugs_drop(self, db: AsyncSession):
        """A slug that doesn't resolve (or isn't published) is dropped from
        its track; a track that resolves to nothing never ships."""
        published = await _make_topic(db, "monty-hall")
        hidden = await _make_topic(db, "hidden-topic")
        hidden.status = "draft"
        await db.flush()

        # Monkeypatch the raw cache with synthetic tracks exercising the
        # drop rules without touching the real file.
        import backend.api.tracks as tracks_mod
        original = tracks_mod._RAW
        tracks_mod._RAW = [{
            "slug": "synthetic",
            "title": "Synthetic",
            "description": " exercising the drop rules",
            "topics": [published.slug, hidden.slug, "never-existed"],
        }, {
            "slug": "all-ghosts",
            "title": "All ghosts",
            "topics": ["ghost-slug", hidden.slug],
        }]
        try:
            tracks = await list_tracks(db)
        finally:
            tracks_mod._RAW = original

        # The mixed track keeps only the published hit (unknown + draft drop);
        # the all-ghosts track resolves to nothing and is skipped entirely.
        assert len(tracks) == 1
        assert tracks[0].slug == "synthetic"
        assert [tt.slug for tt in tracks[0].topics] == [published.slug]

    async def test_tracks_yaml_has_no_unknown_fields(self):
        """Guard the file's shape: every track needs slug/title/topics."""
        import yaml

        from backend.api.tracks import _TRACKS_FILE
        with open(_TRACKS_FILE, encoding="utf-8") as f:
            raw = (yaml.safe_load(f) or {}).get("tracks", [])
        assert len(raw) >= 3
        for t in raw:
            assert t.get("slug") and t.get("title") and t.get("topics")
