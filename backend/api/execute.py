"""Code execution routes — run Python/R code in sandboxed containers."""

from fastapi import APIRouter, HTTPException

from backend.config import settings
from backend.deps import CurrentUser
from backend.models.user import UserRole
from backend.schemas.execution import ExecutionRequest, ExecutionResponse
from backend.services import execution_service
from backend.services.rate_limit import execution_limiter

router = APIRouter()

# Roles that get the higher execution tier. Professors run live demos;
# editors/admins exercise content at authoring pace.
_PROFESSOR_TIER = {UserRole.PROFESSOR.value, UserRole.EDITOR.value, UserRole.ADMIN.value}


@router.post("", response_model=ExecutionResponse)
async def execute_code(data: ExecutionRequest, user: CurrentUser):
    """Execute code in a sandboxed environment.

    Auth required (S1). Rate limits, enforced per user per minute:
    - Learners/contributors: `settings.execution_rate_limit_learner` (default 10)
    - Professors/editors/admins: `settings.execution_rate_limit_professor` (default 60)
    """
    if data.language not in ("python", "r"):
        raise HTTPException(status_code=400, detail="Supported languages: python, r")

    limit = (
        settings.execution_rate_limit_professor
        if user.role in _PROFESSOR_TIER
        else settings.execution_rate_limit_learner
    )
    retry_after = execution_limiter.check(f"exec:{user.id}", limit)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail=f"Execution rate limit reached ({limit}/minute). Try again shortly.",
            headers={"Retry-After": str(max(1, int(retry_after + 0.999)))},
        )

    result = await execution_service.execute_code(
        code=data.code,
        language=data.language,
        timeout=data.timeout,
        theme=data.theme,
    )

    return ExecutionResponse(**result)
