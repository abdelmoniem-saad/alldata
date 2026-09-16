"""Content problem reports, D5.

The lightweight correction door next to the fork pipeline: a reader
spots an error mid-lesson and files a note in ten seconds, no account
required. The endpoint is per-IP rate-limited (the Y1 dam pattern), the
topic slug is validated against the DB, and a signed-in reporter gets
their identity attached via the optional-user dependency. Triage lives
on the admin side (GET/PATCH in api/admin.py).
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select

from backend.config import settings
from backend.deps import DB, OptionalUser, client_ip
from backend.models.report import ContentReport, ReportStatus
from backend.models.topic import Topic
from backend.services.rate_limit import SlidingWindowLimiter

router = APIRouter()

# D5: the report dam. Errors are usually found by readers, so no auth is
# required; 5 notes per minute per IP caps the spam a script can file
# without asking every honest reader for an account.
reports_limiter = SlidingWindowLimiter(window_seconds=60.0)

MIN_NOTE, MAX_NOTE = 10, 2000


class ReportCreate(BaseModel):
    topic_slug: str
    note: str
    block_anchor: str | None = None


class ReportOut(BaseModel):
    id: UUID
    topic_slug: str
    block_anchor: str | None
    note: str
    status: str
    created_at: datetime
    reporter_name: str | None = None
    resolution_note: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ReportOut)
async def create_report(
    data: ReportCreate,
    request: Request,
    db: DB,
    user: OptionalUser,
):
    # D5: the per-IP dam, counted before any DB work (the Y1 pattern).
    retry_after = reports_limiter.check(
        f"report:{client_ip(request)}", settings.report_rate_limit
    )
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many reports from this address. Try again shortly.",
            headers={"Retry-After": str(max(1, int(retry_after + 0.999)))},
        )

    slug = data.topic_slug.strip()
    note = data.note.strip()
    if len(note) < MIN_NOTE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Please describe the problem (at least {MIN_NOTE} characters).",
        )
    if len(note) > MAX_NOTE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Note too long (max {MAX_NOTE} characters).",
        )

    topic = (
        await db.execute(select(Topic).where(Topic.slug == slug))
    ).scalar_one_or_none()
    if topic is None or topic.status != "published":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Unknown topic"
        )

    report = ContentReport(
        topic_slug=slug,
        block_anchor=data.block_anchor.strip() if data.block_anchor else None,
        note=note,
        reporter_id=user.id if user else None,
        status=ReportStatus.OPEN.value,
    )
    db.add(report)
    await db.flush()

    return ReportOut(
        id=report.id,
        topic_slug=report.topic_slug,
        block_anchor=report.block_anchor,
        note=report.note,
        status=report.status,
        created_at=report.created_at,
        reporter_name=user.display_name if user else None,
    )
