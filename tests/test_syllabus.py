"""D1: the public curriculum map.

`seed/syllabus.yaml` is the source of truth; `GET /api/syllabus` resolves
topic slugs against the live DB. These tests pin the contract: written
units link real published topics, planned units carry no topic, every
shipped slug exists in the schema, and an unpublished topic flips its
unit to planned rather than serving a dead link. (The pytest DB starts
empty, so representative topics are created here, as test_tracks does.)
"""

from pathlib import Path

import pytest
import yaml
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.topic import Topic
from tests.test_cycle_a import _topic

_SYLLABUS_FILE = Path(__file__).resolve().parent.parent / "seed" / "syllabus.yaml"


async def _make_topic(db: AsyncSession, slug: str) -> Topic:
    return await _topic(db, slug, slug.replace("-", " ").title())


def _unit_index(areas: list[dict]) -> dict[str, dict]:
    """Flatten the response into {topic_slug: unit} for written units."""
    out: dict[str, dict] = {}
    for a in areas:
        for u in a["units"]:
            if u["topic"]:
                out[u["topic"]["slug"]] = u
    return out


@pytest.mark.asyncio
async def test_syllabus_resolves_written_units(db: AsyncSession, client: AsyncClient):
    """Created topics resolve as written units with real titles; units
    without a lesson stay planned and carry a note."""
    # One representative topic per area.
    for slug in (
        "sample-spaces", "bayes-theorem", "normal-distribution",
        "confidence-intervals", "hypothesis-testing", "simple-linear-regression",
        "cross-validation", "data-wrangling",
    ):
        await _make_topic(db, slug)

    r = await client.get("/api/syllabus")
    assert r.status_code == 200
    areas = r.json()
    assert len(areas) >= 5

    index = _unit_index(areas)
    for slug in ("sample-spaces", "bayes-theorem", "hypothesis-testing", "data-wrangling"):
        assert index[slug]["topic"]["title"] == slug.replace("-", " ").title()
        assert index[slug]["note"] is None

    all_units = [u for a in areas for u in a["units"]]
    planned = [u for u in all_units if u["status"] == "planned"]
    # The map declares its gaps, and each one says why it exists.
    assert len(planned) >= 10
    # Units PLANNED BY DESIGN (no topic: in the YAML) must carry a note;
    # a unit that flipped to planned only because its topic is unpublished
    # in this (unseeded) test DB has no note, and that's fine.
    raw = yaml.safe_load(_SYLLABUS_FILE.read_text(encoding="utf-8"))
    planned_by_design = {
        u["title"]
        for area in raw["areas"]
        for u in area.get("units", [])
        if not u.get("topic")
    }
    for u in planned:
        assert u["topic"] is None
        if u["title"] in planned_by_design:
            assert u["note"], f"planned unit {u['title']!r} has no note"


@pytest.mark.asyncio
async def test_syllabus_slugs_all_exist_in_schema():
    """Guard the YAML: a `topic:` that doesn't match a schema topic is a
    typo that would silently flip a written unit to planned."""
    raw = yaml.safe_load(_SYLLABUS_FILE.read_text(encoding="utf-8"))
    referenced = {
        u["topic"]
        for area in raw["areas"]
        for u in area.get("units", [])
        if u.get("topic")
    }
    schema_path = _SYLLABUS_FILE.parent / "schema.yaml"
    schema_slugs = {
        t["slug"]
        for t in yaml.safe_load(schema_path.read_text(encoding="utf-8"))["topics"]
    }
    missing = referenced - schema_slugs
    assert not missing, f"syllabus.yaml references unknown topics: {sorted(missing)}"


@pytest.mark.asyncio
async def test_unpublished_topic_flips_to_planned(db: AsyncSession, client: AsyncClient):
    """A unit whose topic is unpublished resolves to planned, never to a
    dead link."""
    await _make_topic(db, "hypothesis-testing")
    r = await client.get("/api/syllabus")
    assert _unit_index(r.json()).get("hypothesis-testing") is not None

    topic = (await db.execute(select(Topic).where(Topic.slug == "hypothesis-testing"))).scalar_one()
    topic.status = "draft"
    await db.commit()

    r = await client.get("/api/syllabus")
    assert _unit_index(r.json()).get("hypothesis-testing") is None

