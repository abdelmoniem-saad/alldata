"""The public curriculum map, D1.

`seed/syllabus.yaml` is the source of truth (principle 7, same pattern as
tracks.py): each area lists the units of the statistics & data-science
curriculum in a learner's order, and each unit either links the lesson
that teaches it (`topic:` slug) or is a declared-but-unwritten piece of
the map. The endpoint resolves slugs against the live DB at read time, so
an unpublished or unknown slug drops back to "planned" rather than
producing a dead link — the map never lies, it just stays honest about
what's written.
"""

from pathlib import Path

import yaml
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from backend.deps import DB
from backend.models.topic import Topic

router = APIRouter()

_SYLLABUS_FILE = Path(__file__).resolve().parent.parent.parent / "seed" / "syllabus.yaml"

_RAW: list[dict] | None = None


def _raw_areas() -> list[dict]:
    global _RAW
    if _RAW is None:
        with open(_SYLLABUS_FILE, encoding="utf-8") as f:
            _RAW = (yaml.safe_load(f) or {}).get("areas", [])
    return _RAW


class SyllabusTopic(BaseModel):
    slug: str
    title: str
    difficulty: str | None = None


class SyllabusUnit(BaseModel):
    title: str
    status: str  # "written" | "planned"
    note: str | None = None
    topic: SyllabusTopic | None = None


class SyllabusArea(BaseModel):
    slug: str
    title: str
    description: str | None = None
    units: list[SyllabusUnit]


@router.get("", response_model=list[SyllabusArea])
async def get_syllabus(db: DB):
    """The curriculum map, resolved against the live database."""
    rows = await db.execute(
        select(Topic.slug, Topic.title, Topic.difficulty).where(Topic.status == "published")
    )
    topics = {slug: SyllabusTopic(slug=slug, title=title, difficulty=diff)
              for slug, title, diff in rows.all()}

    out: list[SyllabusArea] = []
    for area in _raw_areas():
        units: list[SyllabusUnit] = []
        for u in area.get("units", []):
            slug = u.get("topic")
            resolved = topics.get(slug) if slug else None
            units.append(SyllabusUnit(
                title=u["title"],
                status="written" if resolved else "planned",
                note=u.get("note"),
                topic=resolved,
            ))
        out.append(SyllabusArea(
            slug=area["slug"],
            title=area["title"],
            description=area.get("description"),
            units=units,
        ))
    return out
