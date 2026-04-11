"""Authentication routes — register, login, current user."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select

from backend.config import settings
from backend.deps import DB, CurrentUser
from backend.models.user import User
from backend.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm=settings.algorithm)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: DB):
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
async def login(data: UserLogin, db: DB):
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
