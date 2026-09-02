"""Usage analytics model, A10.

One row per (day, kind, slug) with a hit counter, upserted on every
event, so the table stays tiny (topics × kinds × days) and contains
nothing personal: no IPs, no user IDs, no sessions. This is a first-party
pageview/run counter, deliberately not a tracker.
"""

from datetime import date

from sqlalchemy import Date, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    day: Mapped[date] = mapped_column(Date, default=date.today)
    kind: Mapped[str] = mapped_column(String(20))
    slug: Mapped[str] = mapped_column(String(256))
    count: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("day", "kind", "slug", name="uq_usage_day_kind_slug"),
    )
