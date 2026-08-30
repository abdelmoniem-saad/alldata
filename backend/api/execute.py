"""Code execution routes — run Python/R code in sandboxed containers."""

from fastapi import APIRouter, HTTPException, Request

from backend.config import settings
from backend.deps import CurrentUser, client_ip
from backend.models.user import UserRole
from backend.schemas.execution import ExecutionRequest, ExecutionResponse
from backend.services import execution_service
from backend.services.rate_limit import execution_ip_limiter, execution_limiter

router = APIRouter()

# Roles that get the higher execution tier. Professors run live demos;
# editors/admins exercise content at authoring pace.
_PROFESSOR_TIER = {UserRole.PROFESSOR.value, UserRole.EDITOR.value, UserRole.ADMIN.value}


@router.get("/capabilities")
async def capabilities():
    """V0: which execution languages are runnable here ({"python": bool,
    "r": bool}). No auth, pure capability discovery the UI uses to gate the
    R language toggle so readers never hit an "R is not installed" dead end.
    """
    return execution_service.runtime_capabilities()


@router.post("", response_model=ExecutionResponse)
async def execute_code(data: ExecutionRequest, request: Request, user: CurrentUser):
    """Execute code in a sandboxed environment.

    Auth required (S1). Rate limits, enforced per user per minute:
    - Learners/contributors: `settings.execution_rate_limit_learner` (default 10)
    - Professors/editors/admins: `settings.execution_rate_limit_professor` (default 60)
    Plus a per-IP dam (Y1) so one host can't rotate throwaway accounts to
    evade the per-user cap.
    """
    if data.language not in ("python", "r"):
        raise HTTPException(status_code=400, detail="Supported languages: python, r")

    ip_retry_after = execution_ip_limiter.check(
        f"execip:{client_ip(request)}", settings.execution_ip_rate_limit
    )
    if ip_retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Too many executions from this address. Try again shortly.",
            headers={"Retry-After": str(max(1, int(ip_retry_after + 0.999)))},
        )

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
