"""Y1: hardening tests.

Covers the security posture added in cycle Y:
- per-IP dams on /api/auth/login, /api/auth/register, /api/execute (429 + Retry-After)
- the sandbox child environment never carries server secrets
- the local-fallback Python path still executes correct code end-to-end
"""

import pytest
from httpx import AsyncClient

from backend.config import settings
from backend.services.execution_service import _sandbox_env


def _payload(email: str) -> dict:
    return {
        "email": email,
        "display_name": "Y1 Tester",
        "password": "correct-horse-battery",
    }


class TestAuthRateLimit:
    """The per-IP dams on the public auth endpoints (429 + Retry-After)."""

    async def test_login_brute_force_blocked(self, client: AsyncClient):
        await client.post(
            "/api/auth/register", json=_payload("brute@example.com")
        )

        # Burn the login budget. Every attempt counts — success or not.
        last = None
        for _ in range(settings.auth_rate_limit_login):
            last = await client.post(
                "/api/auth/login",
                json={"email": "brute@example.com", "password": "wrong"},
            )
            assert last.status_code == 401

        blocked = await client.post(
            "/api/auth/login",
            json={"email": "brute@example.com", "password": "wrong"},
        )
        assert blocked.status_code == 429
        assert "retry-after" in blocked.headers
        assert int(blocked.headers["retry-after"]) >= 1

    async def test_valid_login_also_counted(self, client: AsyncClient):
        await client.post("/api/auth/register", json=_payload("count@example.com"))
        # A successful guess still had to be guessed; the budget counts it.
        for i in range(settings.auth_rate_limit_login):
            await client.post(
                "/api/auth/login",
                json={"email": "brute2@example.com", "password": "x"},
            )
        resp = await client.post(
            "/api/auth/login", json={"email": "brute2@example.com", "password": "x"}
        )
        assert resp.status_code == 429

    async def test_register_dam(self, client: AsyncClient):
        for i in range(settings.auth_rate_limit_register):
            resp = await client.post(
                "/api/auth/register", json=_payload(f"reg{i}@example.com")
            )
            assert resp.status_code == 201
        blocked = await client.post(
            "/api/auth/register", json=_payload("overflow@example.com")
        )
        assert blocked.status_code == 429
        assert "retry-after" in blocked.headers

    async def test_limiters_isolated_between_tests(self, client: AsyncClient):
        # The conftest autouse fixture resets every limiter; if that broke,
        # the register dam would already be saturated here.
        resp = await client.post("/api/auth/register", json=_payload("fresh@example.com"))
        assert resp.status_code == 201


class TestSandboxEnv:
    """The local-fallback child environment is an allow-list, not an inherit."""

    def test_server_secrets_never_leak(self, monkeypatch):
        monkeypatch.setenv("SECRET_KEY", "super-secret-value")
        monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@host/db")
        monkeypatch.setenv("REDIS_URL", "redis://:pass@host/0")
        env = _sandbox_env(home="/tmp/run")
        for secret in ("SECRET_KEY", "DATABASE_URL", "REDIS_URL", "secret_key"):
            assert secret not in env
        # And the values are gone even if a key looks similar.
        assert all("super-secret" not in v for v in env.values())

    def test_dataset_dir_is_absolute_seed_path(self, monkeypatch):
        monkeypatch.delenv("ALLODATA_DATASET_DIR", raising=False)
        env = _sandbox_env(home="/tmp/run")
        assert env["ALLODATA_DATASET_DIR"].replace("\\", "/").endswith(
            "seed/datasets"
        )

    def test_home_points_at_run_tempdir(self):
        env = _sandbox_env(home="/tmp/run-abc")
        assert env["HOME"] == "/tmp/run-abc"
        assert env["MPLBACKEND"] == "Agg"

    def test_blas_threads_pinned(self):
        # A7: OpenBLAS per-thread virtual mappings blew through RLIMIT_AS
        # ("Memory allocation still failed after 10 retries"); also prevents
        # CPU oversubscription under the concurrency gate.
        env = _sandbox_env(home="/tmp/run")
        assert env["OPENBLAS_NUM_THREADS"] == "1"
        assert env["OMP_NUM_THREADS"] == "1"
        assert env["MKL_NUM_THREADS"] == "1"
        assert env["NUMEXPR_NUM_THREADS"] == "1"

    def test_memory_budget_covers_scientific_stack(self):
        # The stack maps ~1 GB+ virtual (RLIMIT_AS counts virtual, not
        # resident); 512 MB killed every simulation. Guard the floor.
        assert settings.sandbox_local_memory_mb >= 2048


class TestAsyncpgSslTranslation:
    """Y8: SQLAlchemy forwards URL query params to asyncpg.connect() as
    kwargs; asyncpg has no `sslmode` kwarg, so the URL must be translated
    before the engine is built. Regression for the Space's
    `TypeError: connect() got an unexpected keyword argument 'sslmode'`."""

    def test_sslmode_translated_to_ssl_arg(self):

        from backend.database import _engine_setup

        url, kwargs = _engine_setup(
            "postgresql+asyncpg://u:p@ep-x.aws.neon.tech/neondb?sslmode=require"
        )
        assert "sslmode" not in str(url)  # moved out of the URL
        assert kwargs["connect_args"]["ssl"] is not None
        ctx = kwargs["connect_args"]["ssl"]
        # libpq 'require' semantics: encrypt, no verification
        assert ctx.verify_mode == __import__("ssl").CERT_NONE

    def test_channel_binding_dropped(self):
        from backend.database import _engine_setup

        url, _ = _engine_setup(
            "postgresql+asyncpg://u:p@ep-x.aws.neon.tech/neondb"
            "?sslmode=require&channel_binding=require"
        )
        assert "channel_binding" not in str(url)

    def test_sqlite_url_untouched(self):
        from backend.database import _engine_setup

        url, kwargs = _engine_setup("sqlite+aiosqlite:///./test.db")
        assert str(url) == "sqlite+aiosqlite:///./test.db"
        assert "connect_args" not in kwargs
        assert kwargs == {"echo": False}


class TestLocalFallbackSmoke:
    """The hardened Popen path still runs real code end-to-end.

    Gated on matplotlib because the injected wrapper imports it; skips
    cleanly on a bare dev install without the scientific stack.
    """

    async def test_python_hello_world(self):

        pytest.importorskip("matplotlib")
        from backend.services import execution_service as es

        result = await es._execute_local_python('print("y1-ok")', timeout=30)
        assert result["exit_code"] == 0
        assert "y1-ok" in result["stdout"]

    async def test_timeout_returns_clean_error(self):

        pytest.importorskip("matplotlib")
        from backend.services import execution_service as es

        result = await es._execute_local_python("import time; time.sleep(30)", timeout=2)
        assert result["exit_code"] == -1
        assert "timed out" in result["stderr"].lower()

    async def test_load_returns_record_rows(self):
        """B2: load() yields one dict per CSV row, never a pandas
        DataFrame. Iterating a DataFrame yields column names, so the
        monty-hall topic's `g["stay_wins"]` crashed with TypeError on the
        pandas-installed branch while the no-pandas branch stayed green.
        The CSV stores 1/0, so the column arrives as ints (truthy/falsy
        is what the topic code relies on)."""
        pytest.importorskip("matplotlib")
        from backend.services import execution_service as es

        code = (
            'rows = load("monty-hall-runs")\n'
            "assert isinstance(rows, list) and rows, type(rows)\n"
            'assert isinstance(rows[0], dict), type(rows[0])\n'
            'assert isinstance(rows[0]["stay_wins"], int), rows[0]\n'
            'tally = {"stay": 0, "switch": 0}\n'
            "for g in rows:\n"
            '    tally["stay" if g["stay_wins"] else "switch"] += 1\n'
            'print("load-ok", len(rows), tally)\n'
        )
        result = await es._execute_local_python(code, timeout=30)
        assert result["exit_code"] == 0, result["stderr"]
        assert "load-ok" in result["stdout"]
        # The 2/3 vs 1/3 split the topic teaches must survive the contract.
        assert "1000" in result["stdout"]
