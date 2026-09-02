"""Usage tracking endpoint, A10.

POST /api/track, a fire-and-forget beacon from the frontend. No auth
(anonymous readers count), no PII (only {kind, slug}), per-IP rate
limited. Unknown slugs 404 so the counter can't be polluted with garbage
entries; a beacon that 404s is simply dropped by the client.
"""

from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from backend.config import settings
from backend.deps import DB, client_ip
from backend.models.topic import Topic
from backend.services.analytics_service import record_event
from backend.services.rate_limit import SlidingWindowLimiter

router = APIRouter()

track_limiter = SlidingWindowLimiter(window_seconds=60.0)


class TrackRequest(BaseModel):
    kind: Literal["topic_view", "run_click", "decision_pick"]
    slug: str


@router.post("", status_code=204)
async def track(data: TrackRequest, request: Request, db: DB):
    retry_after = track_limiter.check(
        f"track:{client_ip(request)}", settings.track_rate_limit
    )
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Tracking rate limit reached.",
            headers={"Retry-After": str(max(1, int(retry_after + 0.999)))},
        )

    topic = (await db.execute(
        select(Topic.id).where(Topic.slug == data.slug)
    )).first()
    if topic is None:
        raise HTTPException(status_code=404, detail="Unknown topic")

    await record_event(db, data.kind, data.slug)
    from fastapi import Response

    return Response(status_code=204)


from sqlalchemy import select  # noqa: E402  (kept next to usage for clarity)
