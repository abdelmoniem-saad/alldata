"""Authentication routes — register, login, current user.

Y1: both public endpoints are IP-rate-limited (see `settings.auth_rate_limit_*`).
There is no email path yet, so this dam is the only thing standing between a
botnet and unlimited password guessing; it also caps mass account creation.
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select

from backend.config import settings
from backend.deps import DB, CurrentUser, client_ip
from backend.models.user import User
from backend.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from backend.services.rate_limit import SlidingWindowLimiter

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Per-IP sliding windows, one instance per endpoint family so a burst of
# registrations can't eat the login budget (and vice versa).
login_limiter = SlidingWindowLimiter(window_seconds=60.0)
register_limiter = SlidingWindowLimiter(window_seconds=60.0)


def _ip_gate(request: Request, limiter: SlidingWindowLimiter, key: str, limit: int):
    """Raise 429 with a ready-made Retry-After when this IP is over budget."""
    retry_after = limiter.check(key, limit)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Too many requests from this address. Try again shortly.",
            headers={"Retry-After": str(max(1, int(retry_after + 0.999)))},
        )


def _create_token(user_id: str) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": user_id, "exp": expire}, settings.secret_key, algorithm=settings.algorithm
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, request: Request, db: DB):
    # Y1: IP dam before any DB work — caps mass account creation.
    _ip_gate(
        request,
        register_limiter,
        f"register:{client_ip(request)}",
        settings.auth_rate_limit_register,
    )

    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=data.email,
        display_name=data.display_name,
        hashed_password=pwd_context.hash(data.password),
        institution=data.institution,
    )
    db.add(user)
    await db.flush()

    token = _create_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request, db: DB):
    # Y1: count every attempt, success or not — a successful guess still had
    # to be guessed. Wrong-password 401s below are the usual budget consumers.
    _ip_gate(request, login_limiter, f"login:{client_ip(request)}", settings.auth_rate_limit_login)

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    token = _create_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser):
    return UserResponse.model_validate(user)
