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
    # 20s default — educational simulations (Monte Carlo, matplotlib) routinely
    # need more than the old 5s cap. Override via SANDBOX_TIMEOUT_SECONDS env var.
    sandbox_timeout_seconds: int = 20
    sandbox_memory_limit: str = "256m"
    sandbox_cpu_limit: float = 0.5
    execution_rate_limit_learner: int = 10  # per minute
    execution_rate_limit_professor: int = 60  # per minute

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
