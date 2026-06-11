"""Sliding-window rate limiter — S1.

In-memory, per-process. That's the honest fit for the current deployment
(single uvicorn process, SQLite on disk); if the app ever runs multi-process
or multi-host, swap the store for Redis (settings.redis_url is already
configured) — the `check` contract below stays the same.

The window is a deque of hit timestamps per key. A hit older than the window
is evicted lazily on the next check, so memory stays proportional to
(active keys × limit).
"""

import time
from collections import deque


class SlidingWindowLimiter:
    def __init__(self, window_seconds: float = 60.0):
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = {}

    def check(self, key: str, limit: int, now: float | None = None) -> float | None:
        """Record a hit for `key` if under `limit`; return None when allowed.

        When the key is at its limit, the hit is NOT recorded and the return
        value is the seconds until the oldest hit leaves the window — i.e. a
        ready-made Retry-After. `now` is injectable for tests.
        """
        t = time.monotonic() if now is None else now
        window = self._hits.setdefault(key, deque())

        cutoff = t - self.window_seconds
        while window and window[0] <= cutoff:
            window.popleft()

        if len(window) >= limit:
            return max(0.0, window[0] + self.window_seconds - t)

        window.append(t)
        return None

    def reset(self, key: str | None = None) -> None:
        """Clear one key's window, or everything (test hygiene)."""
        if key is None:
            self._hits.clear()
        else:
            self._hits.pop(key, None)


# Module-level instance shared by the execute endpoint. Per-process state —
# see the module docstring for the multi-process upgrade path.
execution_limiter = SlidingWindowLimiter(window_seconds=60.0)
