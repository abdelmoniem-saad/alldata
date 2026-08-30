from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite+aiosqlite:///./alldata.db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    secret_key: str = "dev-secret-key-change-in-production"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    algorithm: str = "HS256"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Code execution
    sandbox_image: str = "alldata-sandbox-python:latest"
    sandbox_r_image: str = "alldata-sandbox-r:latest"
    # 20s default, educational simulations (Monte Carlo, matplotlib) routinely
    # need more than the old 5s cap. Override via SANDBOX_TIMEOUT_SECONDS env var.
    sandbox_timeout_seconds: int = 20
    sandbox_memory_limit: str = "256m"
    sandbox_cpu_limit: float = 0.5
    # S1: when Docker isn't available, the executor can fall back to running
    # code directly on the host interpreter, fine on a dev laptop, never in
    # production. Set SANDBOX_ALLOW_LOCAL_FALLBACK=false to refuse instead;
    # main.py logs a prominent startup warning while this is on.
    sandbox_allow_local_fallback: bool = True
    # W0: R is supported by the executor but unprovisioned by default, no R is
    # installed in the base sandbox image, and most dev hosts lack `Rscript`.
    # The capabilities probe reports R as runnable when `Rscript` is on PATH OR
    # this flag is set; a deployment that builds the sandbox-r image
    # (infra/Dockerfile.sandbox-r) sets SANDBOX_R_ENABLED=true. Keeps the UI's
    # R toggle honest, offered only where R can actually run.
    sandbox_r_enabled: bool = False
    execution_rate_limit_learner: int = 10  # per minute
    execution_rate_limit_professor: int = 60  # per minute
    # Y1: auth endpoints are IP-limited (brute-force dam — there is no email
    # path yet, so password guessing is otherwise unthrottled). Execution is
    # additionally IP-limited so one host can't rotate accounts to evade the
    # per-user cap, and the local-fallback executor has a global concurrency
    # gate plus per-child POSIX rlimits.
    auth_rate_limit_login: int = 10  # per minute per IP
    auth_rate_limit_register: int = 5  # per minute per IP
    execution_ip_rate_limit: int = 30  # per minute per IP
    execution_max_concurrent: int = 2  # global, all users, local-fallback path
    sandbox_local_memory_mb: int = 512  # RLIMIT_AS for the POSIX local fallback

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
