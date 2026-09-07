"""First-party usage analytics, A10.

One job: record (day, kind, slug) counters and aggregate them for the
admin surface. Deliberately minimal: no IPs, no user IDs, no sessions,
no fingerprints. The only thing this can answer is "which topics do
readers open and run, and when", which is what steers the content push.

Writes use select-then-increment rather than a dialect-specific upsert:
the portable version works identically on SQLite and Postgres. The create
race it implies is real (C6: two beacons for the same counter in quick
succession — a learner re-picking a decision — 500'd the loser with a
UNIQUE-constraint violation), so it is absorbed explicitly: the insert
runs in a savepoint, and on conflict the count folds into the row the
other request created.
"""

from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.topic import Topic
from backend.models.usage import UsageEvent

EVENT_KINDS = {"topic_view", "run_click", "decision_pick"}


async def record_event(db: AsyncSession, kind: str, slug: str) -> None:
    """Increment the (today, kind, slug) counter, creating the row if new.

    The create race: two simultaneous first-of-day beacons both select
    "no row" and both INSERT. The loser now rolls back to the savepoint
    and folds its count into the winner's row instead of dying on the
    unique constraint (C6, surfaced by the decision e2e spec).
    """
    day = date.today()
    try:
        async with db.begin_nested():
            row = (await db.execute(
                select(UsageEvent).where(
                    UsageEvent.day == day,
                    UsageEvent.kind == kind,
                    UsageEvent.slug == slug,
                )
            )).scalar_one_or_none()
            if row is None:
                db.add(UsageEvent(day=day, kind=kind, slug=slug, count=1))
                await db.flush()
            else:
                row.count += 1
    except IntegrityError:
        # Lost the create race: the winner's row is committed by now, so a
        # plain re-select finds it. (The savepoint rollback also reverted
        # the loser's colliding INSERT, keeping the session usable.)
        row = (await db.execute(
            select(UsageEvent).where(
                UsageEvent.day == day,
                UsageEvent.kind == kind,
                UsageEvent.slug == slug,
            )
        )).scalar_one()
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


async def trending_topics(db: AsyncSession, days: int = 7, limit: int = 5) -> list[dict]:
    """C3: public trending strip for Home. Top topics by view count over
    the window, joined to the topic for title/domain. Aggregate counts
    only; this table holds nothing identifying to leak. Topics must still
    be published (an unpublished slug drops off the strip, silently)."""
    since = date.today() - timedelta(days=days - 1)
    rows = (await db.execute(
        select(
            UsageEvent.slug,
            func.sum(UsageEvent.count).label("total"),
            Topic.title,
            Topic.domain,
        )
        .join(Topic, Topic.slug == UsageEvent.slug)
        .where(
            UsageEvent.day >= since,
            UsageEvent.kind == "topic_view",
            Topic.status == "published",
        )
        .group_by(UsageEvent.slug, Topic.title, Topic.domain)
        .order_by(func.sum(UsageEvent.count).desc())
        .limit(limit)
    )).all()
    return [
        {"slug": slug, "title": title, "domain": domain, "views": int(total)}
        for slug, total, title, domain in rows
    ]
