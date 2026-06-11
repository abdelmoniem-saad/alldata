"""Unit tests for the S1 sliding-window rate limiter.

Pure service-level tests — injectable `now` means no sleeping, no Docker,
no HTTP. The endpoint wiring (401 unauthenticated, 429 + Retry-After) is
exercised through `test_api.py`-style flows manually; the window mechanics
live here.
"""

from backend.services.rate_limit import SlidingWindowLimiter


class TestSlidingWindow:
    def test_allows_up_to_limit(self):
        lim = SlidingWindowLimiter(window_seconds=60)
        for i in range(10):
            assert lim.check("u1", 10, now=float(i)) is None

    def test_denies_at_limit_with_retry_after(self):
        lim = SlidingWindowLimiter(window_seconds=60)
        for i in range(10):
            lim.check("u1", 10, now=float(i))
        retry = lim.check("u1", 10, now=10.0)
        assert retry is not None
        # Oldest hit at t=0 leaves the window at t=60 → 50s from t=10.
        assert abs(retry - 50.0) < 1e-9

    def test_denied_hit_is_not_recorded(self):
        lim = SlidingWindowLimiter(window_seconds=60)
        for i in range(10):
            lim.check("u1", 10, now=float(i))
        lim.check("u1", 10, now=10.0)   # denied
        lim.check("u1", 10, now=11.0)   # denied — would shrink retry if recorded
        retry = lim.check("u1", 10, now=12.0)
        assert abs(retry - 48.0) < 1e-9  # still measured from the t=0 hit

    def test_window_rolls_over(self):
        lim = SlidingWindowLimiter(window_seconds=60)
        for i in range(10):
            lim.check("u1", 10, now=float(i))
        # At t=60.5 only the t=0 hit has expired — exactly one slot frees up.
        assert lim.check("u1", 10, now=60.5) is None
        # The very next call is over the limit again (hits at t=1..9, 60.5).
        assert lim.check("u1", 10, now=60.7) is not None

    def test_keys_are_isolated(self):
        lim = SlidingWindowLimiter(window_seconds=60)
        for i in range(10):
            lim.check("u1", 10, now=float(i))
        assert lim.check("u1", 10, now=10.0) is not None
        assert lim.check("u2", 10, now=10.0) is None  # different user unaffected

    def test_higher_tier_gets_higher_limit(self):
        lim = SlidingWindowLimiter(window_seconds=60)
        for i in range(60):
            assert lim.check("prof", 60, now=float(i) * 0.5) is None
        assert lim.check("prof", 60, now=30.5) is not None

    def test_reset_clears_one_key(self):
        lim = SlidingWindowLimiter(window_seconds=60)
        for i in range(10):
            lim.check("u1", 10, now=float(i))
        lim.reset("u1")
        assert lim.check("u1", 10, now=10.0) is None
