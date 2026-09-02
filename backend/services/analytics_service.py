"""First-party usage analytics, A10.

One job: record (day, kind, slug) counters and aggregate them for the
admin surface. Deliberately minimal: no IPs, no user IDs, no sessions,
no fingerprints. The only thing this can answer is "which topics do
readers open and run, and when", which is what steers the content push.

Writes use select-then-increment rather than a dialect-specific upsert:
analytics traffic is far below the traffic that would make the race
matter, and the portable version works identically on SQLite and Postgres.
"""

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.usage import UsageEvent

EVENT_KINDS = {"topic_view", "run_click", "decision_pick"}


async def record_event(db: AsyncSession, kind: str, slug: str) -> None:
    """Increment the (today, kind, slug) counter, creating the row if new."""
    day = date.today()
    row = (await db.execute(
        select(UsageEvent).where(
            UsageEvent.day == day,
            UsageEvent.kind == kind,
            UsageEvent.slug == slug,
        )
    )).scalar_one_or_none()
    if row is None:
        db.add(UsageEvent(day=day, kind=kind, slug=slug, count=1))
    else:
        row.count += 1


async def top_events(db: AsyncSession, days: int = 30) -> dict:
    """Aggregate the last `days` days into per-topic view/run/pick totals."""
    since = date.today() - timedelta(days=days - 1)
    rows = (await db.execute(
        select(UsageEvent.slug, UsageEvent.kind, func.sum(UsageEvent.count).label("total"))
        .where(UsageEvent.day >= since)
        .group_by(UsageEvent.slug, UsageEvent.kind)
    )).all()

    topics: dict[str, dict[str, int]] = {}
    totals = {"topic_view": 0, "run_click": 0, "decision_pick": 0}
    for slug, kind, total in rows:
        entry = topics.setdefault(slug, {"views": 0, "runs": 0, "picks": 0})
        if kind == "topic_view":
            entry["views"] += int(total)
            totals["topic_view"] += int(total)
        elif kind == "run_click":
            entry["runs"] += int(total)
            totals["run_click"] += int(total)
        elif kind == "decision_pick":
            entry["picks"] += int(total)
            totals["decision_pick"] += int(total)

    ranked = sorted(
        (
            {"slug": slug, **counts}
            for slug, counts in topics.items()
        ),
        key=lambda e: (-e["views"], -e["runs"], e["slug"]),
    )
    return {"days": days, "totals": totals, "topics": ranked}
