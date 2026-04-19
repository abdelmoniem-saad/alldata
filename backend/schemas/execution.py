from pydantic import BaseModel


class ExecutionRequest(BaseModel):
    code: str
    language: str = "python"  # "python" or "r"
    timeout: int | None = None  # Override default timeout
    theme: str = "dark"  # "dark" or "light"


class ExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: int
    images: list[str]  # Base64-encoded plot images
    truncated: bool = False  # True if output was too long
