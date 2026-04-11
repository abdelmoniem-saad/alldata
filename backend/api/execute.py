"""Code execution routes — run Python/R code in sandboxed containers."""

from fastapi import APIRouter, HTTPException

from backend.deps import DB
from backend.schemas.execution import ExecutionRequest, ExecutionResponse
from backend.services import execution_service

router = APIRouter()


@router.post("", response_model=ExecutionResponse)
async def execute_code(data: ExecutionRequest):
    """Execute code in a sandboxed environment.

    Rate limits:
    - Learners: 10 executions per minute
    - Professors: 60 executions per minute
    """
    if data.language not in ("python", "r"):
        raise HTTPException(status_code=400, detail="Supported languages: python, r")

    result = await execution_service.execute_code(
        code=data.code,
        language=data.language,
        timeout=data.timeout,
    )

    return ExecutionResponse(**result)
