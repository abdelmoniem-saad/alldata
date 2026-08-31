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
    # A3: the admin user-management surface renders active/deactivated state.
    # Harmless to expose on login/register responses (no secrets here).
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """A2: profile fields a user may edit on their own account."""

    display_name: str | None = None
    bio: str | None = None
    institution: str | None = None


class PasswordChange(BaseModel):
    """A2: password change requires re-verifying the current password."""

    current_password: str
    new_password: str


class RecoveryCodeResponse(BaseModel):
    """A2: the recovery code, returned exactly once at generation time."""

    recovery_code: str
    generated_at: datetime


class RecoverRequest(BaseModel):
    """A2: exchange email + single-use recovery code for a login token."""

    email: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
