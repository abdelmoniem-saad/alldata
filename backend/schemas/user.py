import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: str
    display_name: str
    password: str
    institution: str | None = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    role: str
    institution: str | None
    bio: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
