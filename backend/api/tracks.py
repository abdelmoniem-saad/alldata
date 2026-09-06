"""Curated guided tracks, C3.

`seed/tracks.yaml` is the source of truth (principle 7): each track is a
curated reading order over existing topics. The endpoint resolves every
slug against the live DB and drops any that don't resolve (or belong to
an unpublished topic), so a track can never dead-end mid-list. The YAML
is read once per process and cached; it changes only via deploy.
"""

from pathlib import Path

import yaml
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from backend.deps import DB
from backend.models.topic import Topic

router = APIRouter()

_TRACKS_FILE = Path(__file__).resolve().parent.parent.parent / "seed" / "tracks.yaml"

_RAW: list[dict] | None = None


def _raw_tracks() -> list[dict]:
    global _RAW
    if _RAW is None:
        with open(_TRACKS_FILE, encoding="utf-8") as f:
            _RAW = (yaml.safe_load(f) or {}).get("tracks", [])
    return _RAW


class TrackTopic(BaseModel):
    slug: str
    title: str


class Track(BaseModel):
    slug: str
    title: str
    description: str | None = None
    topics: list[TrackTopic]


@router.get("", response_model=list[Track])
async def list_tracks(db: DB):
    rows = await db.execute(
        select(Topic.slug, Topic.title).where(Topic.status == "published")
    )
    titles = {slug: title for slug, title in rows.all()}

    out: list[Track] = []
    for t in _raw_tracks():
        topics = [
            TrackTopic(slug=s, title=titles[s])
            for s in t.get("topics", [])
            if s in titles
        ]
        if not topics:
            continue
        out.append(Track(
            slug=t["slug"],
            title=t["title"],
            description=t.get("description"),
            topics=topics,
        ))
    return out
